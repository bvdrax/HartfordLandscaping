import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/middleware'
import { ok, err, serverError } from '@/lib/api'

// Auto-generate invoice number: INV-YYYYMMDD-NNN
async function nextInvoiceNumber(): Promise<string> {
  const prefix = 'INV-' + new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const last = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
  })
  const seq = last ? parseInt(last.invoiceNumber.split('-').pop() ?? '0') + 1 : 1
  return `${prefix}-${String(seq).padStart(3, '0')}`
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req)
    const { searchParams } = req.nextUrl
    const projectId = searchParams.get('projectId')

    const invoices = await prisma.invoice.findMany({
      where: projectId ? { projectId } : undefined,
      include: {
        project: { select: { id: true, name: true } },
        _count: { select: { payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    void session
    return ok(invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      projectId: inv.projectId,
      projectName: inv.project.name,
      quoteId: inv.quoteId,
      status: inv.status,
      type: inv.type,
      amountDue: Number(inv.amountDue),
      amountPaid: Number(inv.amountPaid),
      taxRate: Number(inv.taxRate),
      taxAmount: Number(inv.taxAmount),
      total: Number(inv.total),
      dueDate: inv.dueDate?.toISOString() ?? null,
      sentAt: inv.sentAt?.toISOString() ?? null,
      paidAt: inv.paidAt?.toISOString() ?? null,
      notes: inv.notes,
      createdAt: inv.createdAt.toISOString(),
      paymentCount: inv._count.payments,
    })))
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req)
    const canCreate = ['OWNER', 'PROJECT_MANAGER', 'PLATFORM_ADMIN'].includes(session.role as string)
    if (!canCreate) return err('Forbidden', 403)

    const body = await req.json()
    const { projectId, quoteId, type, amountDue, taxRate, dueDate, notes } = body

    if (!projectId) return err('projectId is required')
    if (!amountDue || amountDue <= 0) return err('amountDue must be positive')

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return err('Project not found', 404)

    const taxRateNum = Number(taxRate ?? 0)
    const amountDueNum = Number(amountDue)
    const taxAmount = Math.round(amountDueNum * taxRateNum * 100) / 100
    const total = Math.round((amountDueNum + taxAmount) * 100) / 100

    const invoiceNumber = await nextInvoiceNumber()

    const invoice = await prisma.invoice.create({
      data: {
        projectId,
        quoteId: quoteId ?? null,
        invoiceNumber,
        type: type ?? 'FINAL',
        status: 'DRAFT',
        amountDue: amountDueNum,
        taxRate: taxRateNum,
        taxAmount,
        total,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes ?? null,
      },
    })

    return ok({ id: invoice.id, invoiceNumber: invoice.invoiceNumber })
  } catch (e) {
    return serverError(e)
  }
}
