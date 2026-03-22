import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, notFound, serverError, err } from '@/lib/api'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { Role } from '@prisma/client'

const ALLOWED_ROLES: Role[] = [Role.OWNER, Role.PROJECT_MANAGER, Role.PLATFORM_ADMIN, Role.ACCOUNTANT]
const OWNER_ROLES: Role[] = [Role.OWNER, Role.PLATFORM_ADMIN]

function getId(req: NextRequest) { return req.nextUrl.pathname.split('/').pop() ?? '' }

export async function GET(req: NextRequest) {
  try {
    requireSession(req)
    const supplier = await prisma.supplier.findUnique({
      where: { id: getId(req) },
      include: {
        skus: { where: { isActive: true }, orderBy: { name: 'asc' }, include: { bulkPricingTiers: { orderBy: { minQuantity: 'asc' } } } },
        priceLists: { orderBy: { effectiveDate: 'desc' }, take: 5 },
        _count: { select: { skus: true } },
      },
    })
    if (!supplier) return notFound('Supplier')
    return ok({ supplier })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, ALLOWED_ROLES)
    const id = getId(req)
    const existing = await prisma.supplier.findUnique({ where: { id } })
    if (!existing) return notFound('Supplier')
    const { name, accountNumber, repName, repPhone, repEmail, notes, isActive } = await req.json()
    if (name !== undefined && !name?.trim()) return err('Supplier name is required')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {}
    if (name !== undefined) data.name = name.trim()
    if (accountNumber !== undefined) data.accountNumber = accountNumber || null
    if (repName !== undefined) data.repName = repName || null
    if (repPhone !== undefined) data.repPhone = repPhone || null
    if (repEmail !== undefined) data.repEmail = repEmail || null
    if (notes !== undefined) data.notes = notes || null
    if (isActive !== undefined) data.isActive = isActive
    const supplier = await prisma.supplier.update({ where: { id }, data })
    return ok({ supplier })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, OWNER_ROLES)
    const id = getId(req)
    const existing = await prisma.supplier.findUnique({ where: { id } })
    if (!existing) return notFound('Supplier')
    const supplier = await prisma.supplier.update({ where: { id }, data: { isActive: false } })
    return ok({ supplier })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}
