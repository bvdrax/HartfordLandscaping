import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { Role } from '@prisma/client'

const ALLOWED: Role[] = [Role.OWNER, Role.PLATFORM_ADMIN, Role.ACCOUNTANT]

function csv(rows: string[][]): string {
  return rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
}

export async function GET(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, ALLOWED)

    const type = req.nextUrl.searchParams.get('type') ?? 'profitability'
    const from = req.nextUrl.searchParams.get('from')
    const to = req.nextUrl.searchParams.get('to')

    const fromDate = from ? new Date(from) : undefined
    const toDate = to ? new Date(to) : undefined

    let content = ''
    let filename = 'export.csv'

    if (type === 'profitability') {
      filename = 'profitability.csv'
      const projects = await prisma.project.findMany({
        include: {
          quotes: {
            where: { status: 'APPROVED' },
            include: { lineItems: true },
          },
          receipts: {
            where: { status: 'APPROVED' },
            include: { lineItems: true },
          },
          timeLogs: {
            where: { clockOutAt: { not: null } },
            include: { user: { include: { workerProfile: true } } },
          },
          invoices: { where: { status: { in: ['PAID', 'PARTIAL'] } } },
        },
        orderBy: { createdAt: 'desc' },
      })

      const rows: string[][] = [['Project', 'Status', 'Quoted Revenue', 'Materials Cost', 'Labor Cost', 'Total Cost', 'Gross Profit', 'Gross Margin %', 'Amount Collected']]

      for (const p of projects) {
        const quotedRevenue = p.quotes.reduce((s, q) => s + Number(q.total), 0)
        const materialsCost = p.receipts.reduce((s, r) => s + r.lineItems.reduce((ls, li) => ls + Number(li.totalCost), 0), 0)
        const laborCost = p.timeLogs.reduce((s, l) => {
          const rate = Number(l.user.workerProfile?.hourlyRate ?? 0)
          return s + (l.totalMinutes ?? 0) / 60 * rate
        }, 0)
        const totalCost = materialsCost + laborCost
        const grossProfit = quotedRevenue - totalCost
        const margin = quotedRevenue > 0 ? (grossProfit / quotedRevenue * 100) : 0
        const collected = p.invoices.reduce((s, inv) => s + Number(inv.amountPaid), 0)

        rows.push([
          p.name, p.status,
          quotedRevenue.toFixed(2), materialsCost.toFixed(2), laborCost.toFixed(2),
          totalCost.toFixed(2), grossProfit.toFixed(2), margin.toFixed(1) + '%',
          collected.toFixed(2),
        ])
      }
      content = csv(rows)

    } else if (type === 'hours') {
      filename = 'worker-hours.csv'
      const whereDate = fromDate || toDate ? {
        clockInAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) },
      } : {}

      const logs = await prisma.timeLog.findMany({
        where: { clockOutAt: { not: null }, ...whereDate },
        include: {
          user: { include: { workerProfile: true } },
          project: { select: { name: true } },
        },
        orderBy: { clockInAt: 'desc' },
      })

      const rows: string[][] = [['Date', 'Worker', 'Role', 'Project', 'Hours', 'Break (min)', 'Rate', 'Earnings', 'Approved']]
      for (const l of logs) {
        const hrs = (l.totalMinutes ?? 0) / 60
        const rate = Number(l.user.workerProfile?.hourlyRate ?? 0)
        rows.push([
          new Date(l.clockInAt).toLocaleDateString(),
          `${l.user.firstName} ${l.user.lastName}`,
          l.user.role,
          l.project.name,
          hrs.toFixed(2),
          String(l.breakMinutes),
          rate > 0 ? rate.toFixed(2) : '-',
          rate > 0 ? (hrs * rate).toFixed(2) : '-',
          l.approvedAt ? 'Yes' : 'No',
        ])
      }
      content = csv(rows)

    } else if (type === 'invoices') {
      filename = 'invoices.csv'
      const whereDate = fromDate || toDate ? {
        createdAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) },
      } : {}

      const invoices = await prisma.invoice.findMany({
        where: whereDate,
        include: {
          project: { select: { name: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      const rows: string[][] = [['Invoice #', 'Project', 'Type', 'Status', 'Amount Due', 'Tax', 'Total', 'Amount Paid', 'Balance', 'Due Date', 'Sent', 'Paid']]
      for (const inv of invoices) {
        const balance = Number(inv.total) - Number(inv.amountPaid)
        rows.push([
          inv.invoiceNumber, inv.project.name, inv.type as string, inv.status as string,
          Number(inv.amountDue).toFixed(2), Number(inv.taxAmount).toFixed(2), Number(inv.total).toFixed(2),
          Number(inv.amountPaid).toFixed(2), balance.toFixed(2),
          inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '',
          inv.sentAt ? new Date(inv.sentAt).toLocaleDateString() : '',
          inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : '',
        ])
      }
      content = csv(rows)

    } else if (type === 'suppliers') {
      filename = 'supplier-spend.csv'
      const whereDate = fromDate || toDate ? {
        receiptDate: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) },
      } : {}

      const receipts = await prisma.receipt.findMany({
        where: { status: 'APPROVED', ...whereDate },
        include: { project: { select: { name: true } } },
        orderBy: { receiptDate: 'desc' },
      })

      // Group by vendor
      const byVendor: Record<string, { count: number; total: number }> = {}
      for (const r of receipts) {
        const v = r.vendor ?? 'Unknown'
        if (!byVendor[v]) byVendor[v] = { count: 0, total: 0 }
        byVendor[v].count++
        byVendor[v].total += Number(r.totalAmount ?? 0)
      }

      const rows: string[][] = [['Vendor', 'Receipt Count', 'Total Spend']]
      for (const [vendor, data] of Object.entries(byVendor).sort((a, b) => b[1].total - a[1].total)) {
        rows.push([vendor, String(data.count), data.total.toFixed(2)])
      }
      content = csv(rows)
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    if (e instanceof ApiError) {
      return new NextResponse(e.message, { status: e.status })
    }
    console.error(e)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
