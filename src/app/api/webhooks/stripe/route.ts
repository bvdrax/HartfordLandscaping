import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const stripe = new Stripe(secret, { apiVersion: '2026-02-25.clover' })
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent
    const invoiceId = pi.metadata?.invoiceId
    if (invoiceId) {
      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })
      if (invoice && invoice.status !== 'PAID') {
        const amount = pi.amount_received / 100

        await prisma.payment.create({
          data: {
            invoiceId,
            amount,
            paymentMethod: 'CARD_STRIPE',
            paidAt: new Date(),
            referenceNumber: pi.id,
          },
        })

        const payments = await prisma.payment.findMany({ where: { invoiceId } })
        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
        const invoiceTotal = Number(invoice.total)
        const newStatus = totalPaid >= invoiceTotal ? 'PAID' : 'PARTIAL'

        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            amountPaid: totalPaid,
            status: newStatus,
            stripePaymentIntentId: pi.id,
            paidAt: newStatus === 'PAID' ? new Date() : null,
          },
        })
      }
    }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const invoiceId = session.metadata?.invoiceId
    if (invoiceId && session.payment_status === 'paid') {
      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })
      if (invoice && invoice.status !== 'PAID') {
        const amount = (session.amount_total ?? 0) / 100

        await prisma.payment.create({
          data: {
            invoiceId,
            amount,
            paymentMethod: 'CARD_STRIPE',
            paidAt: new Date(),
            referenceNumber: session.payment_intent as string,
          },
        })

        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            amountPaid: amount,
            status: 'PAID',
            paidAt: new Date(),
          },
        })
      }
    }
  }

  return NextResponse.json({ received: true })
}
