import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/middleware'
import { ok, err, notFound, serverError } from '@/lib/api'
import { sendInvoiceEmail } from '@/lib/email'

function getId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/')
  return parts[parts.indexOf('invoices') + 1] ?? ''
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not set')
  return new Stripe(key, { apiVersion: '2026-02-25.clover' })
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req)
    const canSend = ['OWNER', 'PROJECT_MANAGER', 'PLATFORM_ADMIN'].includes(session.role as string)
    if (!canSend) return err('Forbidden', 403)

    const id = getId(req)
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        project: {
          include: { customers: { where: { isPrimary: true }, take: 1 } },
        },
      },
    })
    if (!invoice) return notFound('Invoice')
    if (invoice.status === 'VOID') return err('Cannot send a voided invoice')

    const primaryCustomer = invoice.project.customers[0]
    if (!primaryCustomer?.email) return err('Project has no primary customer with an email address')

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // Create Stripe Payment Link
    let paymentUrl: string | null = null
    try {
      const stripe = getStripe()
      const totalCents = Math.round(Number(invoice.total) * 100)
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: { name: invoice.project.name + ' - ' + invoice.invoiceNumber },
              unit_amount: totalCents,
            },
            quantity: 1,
          },
        ],
        metadata: { invoiceId: invoice.id },
        after_completion: { type: 'redirect', redirect: { url: baseUrl + '/invoices/' + invoice.id } },
      })
      paymentUrl = paymentLink.url
      await prisma.invoice.update({ where: { id }, data: { stripeInvoiceId: paymentLink.id } })
    } catch {
      // Stripe not configured — send without payment link
    }

    await sendInvoiceEmail({
      to: primaryCustomer.email,
      customerName: primaryCustomer.firstName,
      projectName: invoice.project.name,
      invoiceNumber: invoice.invoiceNumber,
      total: Number(invoice.total),
      dueDate: invoice.dueDate ?? null,
      paymentUrl,
    })

    await prisma.invoice.update({
      where: { id },
      data: { status: invoice.status === 'DRAFT' ? 'SENT' : invoice.status, sentAt: new Date() },
    })

    return ok({ sent: true, to: primaryCustomer.email, paymentUrl })
  } catch (e) {
    return serverError(e)
  }
}
