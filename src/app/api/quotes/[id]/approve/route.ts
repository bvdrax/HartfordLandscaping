import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, notFound, serverError, err } from '@/lib/api'
import { verifyPortalToken } from '@/lib/auth'
import { ApiError } from '@/lib/middleware'

function getQuoteId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/')
  const idx = parts.indexOf('approve')
  return idx > 0 ? parts[idx - 1] : ''
}

export async function POST(req: NextRequest) {
  try {
    // Extract portal token from Authorization header or body
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (await req.json().catch(() => ({}))).token

    if (!token) return NextResponse.json({ data: null, error: 'Portal token required', meta: null }, { status: 401 })

    // Verify portal token
    let customerId: string
    let projectId: string
    try {
      const payload = verifyPortalToken(token)
      customerId = payload.customerId
      projectId = payload.projectId
    } catch {
      return NextResponse.json({ data: null, error: 'Invalid or expired portal link', meta: null }, { status: 401 })
    }

    // Validate token is still active (not superseded)
    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    if (!customer || customer.magicLinkToken !== token) {
      return NextResponse.json({ data: null, error: 'Portal link is no longer valid', meta: null }, { status: 401 })
    }

    const quoteId = getQuoteId(req)
    const quote = await prisma.quote.findUnique({ where: { id: quoteId } })
    if (!quote) return notFound('Quote')
    if (quote.projectId !== projectId) return err('Quote does not belong to this project')
    if (quote.status !== 'SENT') return err('Only SENT quotes can be approved')

    const updated = await prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedByCustomerId: customerId,
      },
    })

    return ok({ quote: { id: updated.id, status: updated.status, approvedAt: updated.approvedAt } })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}
