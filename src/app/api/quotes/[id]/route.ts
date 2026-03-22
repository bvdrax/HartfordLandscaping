import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, notFound, serverError, err } from '@/lib/api'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { Role } from '@prisma/client'
import { writeAudit } from '@/lib/audit'
import { QuotePatchSchema, parseBody } from '@/lib/validation'

const MGMT: Role[] = [Role.OWNER, Role.PROJECT_MANAGER, Role.PLATFORM_ADMIN]

function getId(req: NextRequest) { return req.nextUrl.pathname.split('/').filter(Boolean).slice(-1)[0] ?? '' }

export async function GET(req: NextRequest) {
  try {
    requireSession(req)
    const quote = await prisma.quote.findUnique({
      where: { id: getId(req) },
      include: {
        project: { select: { id: true, name: true, globalMarginOverride: true } },
        lineItems: { include: { sku: { select: { id: true, name: true, unitOfMeasure: true } } }, orderBy: { sortOrder: 'asc' } },
        _count: { select: { lineItems: true } },
      },
    })
    if (!quote) return notFound('Quote')
    return ok({ quote })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, MGMT)
    const id = getId(req)
    const existing = await prisma.quote.findUnique({ where: { id } })
    if (!existing) return notFound('Quote')
    if (existing.status !== 'DRAFT') return err('Only DRAFT quotes can be edited')

    const rawBody = await req.json()
    const parsed = parseBody(QuotePatchSchema, rawBody)
    if (!parsed.success) return err(parsed.error)
    const { notes, termsAndConditions, status } = parsed.data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {}
    if (notes !== undefined) data.notes = notes || null
    if (termsAndConditions !== undefined) data.termsAndConditions = termsAndConditions || null
    if (status !== undefined) data.status = status

    const quote = await prisma.quote.update({ where: { id }, data })

    if (status !== undefined && status !== existing.status) {
      await writeAudit({
        entityType: 'Quote', entityId: id, action: 'STATUS_CHANGED',
        changedByUserId: session.userId,
        before: { status: existing.status }, after: { status: quote.status },
      })
    }

    return ok({ quote })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, MGMT)
    const id = getId(req)
    const existing = await prisma.quote.findUnique({ where: { id } })
    if (!existing) return notFound('Quote')
    if (existing.status !== 'DRAFT') return err('Only DRAFT quotes can be deleted')
    await prisma.quote.delete({ where: { id } })
    return ok({ deleted: true })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}
