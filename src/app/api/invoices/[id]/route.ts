import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/middleware'
import { ok, err, notFound, serverError } from '@/lib/api'

function getId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/')
  return parts[parts.indexOf('invoices') + 1] ?? ''
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req)
    void session
    const id = getId(req)
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        quote: { select: { id: true, versionNumber: true } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    })
    if (!invoice) return notFound('Invoice')

    return ok({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      projectId: invoice.projectId,
      projectName: invoice.project.name,
      quoteId: invoice.quoteId,
      quoteVersion: invoice.quote?.versionNumber ?? null,
      status: invoice.status as string,
      type: invoice.type as string,
      amountDue: Number(invoice.amountDue),
      amountPaid: Number(invoice.amountPaid),
      taxRate: Number(invoice.taxRate),
      taxAmount: Number(invoice.taxAmount),
      total: Number(invoice.total),
      dueDate: invoice.dueDate?.toISOString() ?? null,
      sentAt: invoice.sentAt?.toISOString() ?? null,
      paidAt: invoice.paidAt?.toISOString() ?? null,
      stripePaymentIntentId: invoice.stripePaymentIntentId,
      notes: invoice.notes,
      createdAt: invoice.createdAt.toISOString(),
      payments: invoice.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        paymentMethod: p.paymentMethod as string,
        paidAt: p.paidAt.toISOString(),
        referenceNumber: p.referenceNumber,
        notes: p.notes,
      })),
    })
  } catch (e) {
    return serverError(e)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession(req)
    const canEdit = ['OWNER', 'PROJECT_MANAGER', 'PLATFORM_ADMIN'].includes(session.role as string)
    if (!canEdit) return err('Forbidden', 403)

    const id = getId(req)
    const invoice = await prisma.invoice.findUnique({ where: { id } })
    if (!invoice) return notFound('Invoice')
    if (invoice.status === 'VOID') return err('Cannot edit a voided invoice')

    const body = await req.json()
    const { type, amountDue, taxRate, dueDate, notes } = body

    const taxRateNum = taxRate !== undefined ? Number(taxRate) : Number(invoice.taxRate)
    const amountDueNum = amountDue !== undefined ? Number(amountDue) : Number(invoice.amountDue)
    const taxAmount = Math.round(amountDueNum * taxRateNum * 100) / 100
    const total = Math.round((amountDueNum + taxAmount) * 100) / 100

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        type: type ?? invoice.type,
        amountDue: amountDueNum,
        taxRate: taxRateNum,
        taxAmount,
        total,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : invoice.dueDate,
        notes: notes !== undefined ? notes : invoice.notes,
      },
    })

    return ok({ id: updated.id, total: Number(updated.total) })
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSession(req)
    const canVoid = ['OWNER', 'PLATFORM_ADMIN'].includes(session.role as string)
    if (!canVoid) return err('Forbidden', 403)

    const id = getId(req)
    const invoice = await prisma.invoice.findUnique({ where: { id } })
    if (!invoice) return notFound('Invoice')

    // Void rather than delete if already sent
    if (invoice.status === 'SENT' || invoice.status === 'PARTIAL' || invoice.status === 'PAID') {
      await prisma.invoice.update({ where: { id }, data: { status: 'VOID' } })
      return ok({ voided: true })
    }

    await prisma.invoice.delete({ where: { id } })
    return NextResponse.json({ data: { deleted: true }, error: null, meta: null })
  } catch (e) {
    return serverError(e)
  }
}
