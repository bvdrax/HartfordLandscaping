import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/middleware'
import { ok, err, notFound, serverError } from '@/lib/api'

function getId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/')
  return parts[parts.indexOf('invoices') + 1] ?? ''
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req)
    const canRecord = ['OWNER', 'PROJECT_MANAGER', 'PLATFORM_ADMIN'].includes(session.role as string)
    if (!canRecord) return err('Forbidden', 403)

    const id = getId(req)
    const invoice = await prisma.invoice.findUnique({ where: { id }, include: { payments: true } })
    if (!invoice) return notFound('Invoice')
    if (invoice.status === 'VOID') return err('Cannot record payment on a voided invoice')
    if (invoice.status === 'PAID') return err('Invoice is already fully paid')

    const body = await req.json()
    const { amount, paymentMethod, paidAt, referenceNumber, notes } = body

    if (!amount || Number(amount) <= 0) return err('amount must be positive')
    if (!paymentMethod) return err('paymentMethod is required')

    const amountNum = Number(amount)

    await prisma.payment.create({
      data: {
        invoiceId: id,
        amount: amountNum,
        paymentMethod,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        referenceNumber: referenceNumber ?? null,
        notes: notes ?? null,
      },
    })

    // Recalculate amountPaid and status
    const allPayments = await prisma.payment.findMany({ where: { invoiceId: id } })
    const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    const invoiceTotal = Number(invoice.total)
    const newStatus = totalPaid >= invoiceTotal ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : invoice.status

    await prisma.invoice.update({
      where: { id },
      data: {
        amountPaid: totalPaid,
        status: newStatus,
        paidAt: newStatus === 'PAID' ? new Date() : invoice.paidAt,
      },
    })

    return ok({ amountPaid: totalPaid, status: newStatus })
  } catch (e) {
    return serverError(e)
  }
}
