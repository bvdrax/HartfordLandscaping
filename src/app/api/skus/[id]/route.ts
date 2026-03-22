import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, notFound, serverError, err } from '@/lib/api'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { Role } from '@prisma/client'

const ALLOWED_ROLES: Role[] = [Role.OWNER, Role.PROJECT_MANAGER, Role.PLATFORM_ADMIN, Role.ACCOUNTANT]

function getId(req: NextRequest) { return req.nextUrl.pathname.split('/').pop() ?? '' }

export async function PATCH(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, ALLOWED_ROLES)
    const id = getId(req)
    if (!await prisma.sku.findUnique({ where: { id } })) return notFound('SKU')
    const { name, description, supplierItemNumber, unitOfMeasure, basePrice, globalMarginPct, notes, isActive } = await req.json()
    if (name !== undefined && !name?.trim()) return err('SKU name is required')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {}
    if (name !== undefined) data.name = name.trim()
    if (description !== undefined) data.description = description || null
    if (supplierItemNumber !== undefined) data.supplierItemNumber = supplierItemNumber || null
    if (unitOfMeasure !== undefined) data.unitOfMeasure = unitOfMeasure.trim()
    if (basePrice !== undefined) data.basePrice = parseFloat(basePrice)
    if (globalMarginPct !== undefined) data.globalMarginPct = globalMarginPct !== '' && globalMarginPct !== null ? parseFloat(globalMarginPct) : null
    if (notes !== undefined) data.notes = notes || null
    if (isActive !== undefined) data.isActive = isActive
    void session
    const sku = await prisma.sku.update({ where: { id }, data, include: { bulkPricingTiers: { orderBy: { minQuantity: 'asc' } } } })
    return ok({ sku })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, [Role.OWNER, Role.PLATFORM_ADMIN])
    void session
    const id = getId(req)
    if (!await prisma.sku.findUnique({ where: { id } })) return notFound('SKU')
    const sku = await prisma.sku.update({ where: { id }, data: { isActive: false } })
    return ok({ sku })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}
