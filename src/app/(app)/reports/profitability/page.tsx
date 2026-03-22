import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ChevronLeft, Download, TrendingUp } from 'lucide-react'

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function pct(n: number) {
  return n.toFixed(1) + '%'
}

export default async function ProfitabilityPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!['OWNER', 'PLATFORM_ADMIN', 'ACCOUNTANT'].includes(session.role as string)) redirect('/dashboard')

  const projects = await prisma.project.findMany({
    where: { status: { notIn: ['ARCHIVED', 'LEAD'] } },
    include: {
      customers: { where: { isPrimary: true }, take: 1, select: { firstName: true, lastName: true } },
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
        include: { user: { include: { workerProfile: { select: { hourlyRate: true } } } } },
      },
      invoices: { select: { total: true, amountPaid: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const rows = projects.map((p) => {
    const customer = p.customers[0]
    const quotedRevenue = p.quotes.reduce((s, q) => s + Number(q.total), 0)
    const materialsCost = p.receipts.reduce((s, r) => s + r.lineItems.reduce((ls, li) => ls + Number(li.totalCost), 0), 0)
    const laborHours = p.timeLogs.reduce((s, l) => s + (l.totalMinutes ?? 0) / 60, 0)
    const laborCost = p.timeLogs.reduce((s, l) => {
      const rate = Number(l.user.workerProfile?.hourlyRate ?? 0)
      return s + (l.totalMinutes ?? 0) / 60 * rate
    }, 0)
    const totalCost = materialsCost + laborCost
    const grossProfit = quotedRevenue - totalCost
    const margin = quotedRevenue > 0 ? (grossProfit / quotedRevenue * 100) : 0
    const collected = p.invoices.reduce((s, inv) => s + Number(inv.amountPaid), 0)

    return {
      id: p.id,
      name: p.name,
      status: p.status as string,
      customer: customer ? `${customer.firstName} ${customer.lastName}` : '',
      quotedRevenue,
      materialsCost,
      laborCost,
      laborHours,
      totalCost,
      grossProfit,
      margin,
      collected,
    }
  })

  const totals = rows.reduce((s, r) => ({
    quotedRevenue: s.quotedRevenue + r.quotedRevenue,
    materialsCost: s.materialsCost + r.materialsCost,
    laborCost: s.laborCost + r.laborCost,
    totalCost: s.totalCost + r.totalCost,
    grossProfit: s.grossProfit + r.grossProfit,
    collected: s.collected + r.collected,
  }), { quotedRevenue: 0, materialsCost: 0, laborCost: 0, totalCost: 0, grossProfit: 0, collected: 0 })

  const overallMargin = totals.quotedRevenue > 0 ? (totals.grossProfit / totals.quotedRevenue * 100) : 0

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <Link href="/reports" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit">
          <ChevronLeft size={16} />Reports
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-muted-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Profitability</h1>
          </div>
          <a href="/api/reports/export?type=profitability"
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Download size={14} />CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Quoted Revenue</p>
          <p className="text-xl font-bold text-foreground">{fmt(totals.quotedRevenue)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Cost</p>
          <p className="text-xl font-bold text-foreground">{fmt(totals.totalCost)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Gross Profit</p>
          <p className={`text-xl font-bold ${totals.grossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>{fmt(totals.grossProfit)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Overall Margin</p>
          <p className={`text-xl font-bold ${overallMargin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>{pct(overallMargin)}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['Project', 'Status', 'Quoted', 'Materials', 'Labor', 'Total Cost', 'Profit', 'Margin', 'Collected'].map((h) => (
                <th key={h} className={`py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide ${h === 'Project' || h === 'Status' ? 'text-left' : 'text-right'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="py-2.5 px-3">
                  <Link href={`/projects/${r.id}`} className="font-medium text-foreground hover:text-primary">{r.name}</Link>
                  {r.customer && <p className="text-xs text-muted-foreground">{r.customer}</p>}
                </td>
                <td className="py-2.5 px-3 text-muted-foreground text-xs">{r.status.replace('_', ' ')}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{r.quotedRevenue > 0 ? fmt(r.quotedRevenue) : '-'}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{r.materialsCost > 0 ? fmt(r.materialsCost) : '-'}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{r.laborCost > 0 ? fmt(r.laborCost) : '-'}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{r.totalCost > 0 ? fmt(r.totalCost) : '-'}</td>
                <td className={`py-2.5 px-3 text-right tabular-nums font-medium ${r.grossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                  {r.quotedRevenue > 0 ? fmt(r.grossProfit) : '-'}
                </td>
                <td className={`py-2.5 px-3 text-right tabular-nums ${r.margin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                  {r.quotedRevenue > 0 ? pct(r.margin) : '-'}
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums">{r.collected > 0 ? fmt(r.collected) : '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/30">
              <td className="py-2.5 px-3 font-semibold text-foreground" colSpan={2}>Totals</td>
              <td className="py-2.5 px-3 text-right font-semibold tabular-nums">{fmt(totals.quotedRevenue)}</td>
              <td className="py-2.5 px-3 text-right font-semibold tabular-nums">{fmt(totals.materialsCost)}</td>
              <td className="py-2.5 px-3 text-right font-semibold tabular-nums">{fmt(totals.laborCost)}</td>
              <td className="py-2.5 px-3 text-right font-semibold tabular-nums">{fmt(totals.totalCost)}</td>
              <td className="py-2.5 px-3 text-right font-semibold tabular-nums">{fmt(totals.grossProfit)}</td>
              <td className="py-2.5 px-3 text-right font-semibold tabular-nums">{pct(overallMargin)}</td>
              <td className="py-2.5 px-3 text-right font-semibold tabular-nums">{fmt(totals.collected)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
