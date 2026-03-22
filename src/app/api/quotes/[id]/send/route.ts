import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, notFound, serverError, err } from '@/lib/api'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { Role } from '@prisma/client'

const MGMT: Role[] = [Role.OWNER, Role.PROJECT_MANAGER, Role.PLATFORM_ADMIN]

function getQuoteId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/')
  const idx = parts.indexOf('send')
  return idx > 0 ? parts[idx - 1] : ''
}

export async function POST(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, MGMT)
    const quoteId = getQuoteId(req)
    const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { lineItems: true } })
    if (!quote) return notFound('Quote')
    if (quote.status !== 'DRAFT') return err('Only DRAFT quotes can be sent')
    if (quote.lineItems.length === 0) return err('Cannot send a quote with no line items')

    // Calculate expiry: 30 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const updated = await prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'SENT', sentAt: new Date(), expiresAt },
    })

    // TODO: Send email via Resend when configured (Step 9 customer portal)
    void session

    return ok({ quote: updated })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}
