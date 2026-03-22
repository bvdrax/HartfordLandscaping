import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, notFound, serverError, err } from '@/lib/api'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { Role } from '@prisma/client'

const ALLOWED_ROLES: Role[] = [Role.OWNER, Role.PROJECT_MANAGER, Role.PLATFORM_ADMIN, Role.ACCOUNTANT]

function getSupplierId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/')
  const skusIdx = parts.indexOf('skus')
  return skusIdx > 0 ? parts[skusIdx - 1] : ''
}

export async function GET(req: NextRequest) {
  try {
    requireSession(req)
    const supplierId = getSupplierId(req)
    if (!await prisma.supplier.findUnique({ where: { id: supplierId } })) return notFound('Supplier')
    const includeInactive = req.nextUrl.searchParams.get('includeInactive') === 'true'
    const search = req.nextUrl.searchParams.get('search') ?? ''
    const skus = await prisma.sku.findMany({
      where: {
        supplierId,
        ...(includeInactive ? {} : { isActive: true }),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      include: { bulkPricingTiers: { orderBy: { minQuantity: 'asc' } } },
      orderBy: { name: 'asc' },
    })
    return ok({ skus })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, ALLOWED_ROLES)
    const supplierId = getSupplierId(req)
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
    if (!supplier) return notFound('Supplier')

    const { name, description, supplierItemNumber, unitOfMeasure, basePrice, globalMarginPct, notes } = await req.json()
    if (!name?.trim()) return err('SKU name is required')
    if (!unitOfMeasure?.trim()) return err('Unit of measure is required')
    if (basePrice === undefined || basePrice === null || isNaN(parseFloat(basePrice))) return err('Valid base price is required')

    // Ensure a default price list exists for this supplier
    let priceList = await prisma.priceList.findFirst({ where: { supplierId, isActive: true }, orderBy: { effectiveDate: 'desc' } })
    if (!priceList) {
      priceList = await prisma.priceList.create({
        data: { supplierId, name: 'Default', effectiveDate: new Date(), isActive: true, uploadedByUserId: session.userId },
      })
    }

    const sku = await prisma.sku.create({
      data: {
        supplierId,
        priceListId: priceList.id,
        name: name.trim(),
        description: description || null,
        supplierItemNumber: supplierItemNumber || null,
        unitOfMeasure: unitOfMeasure.trim(),
        basePrice: parseFloat(basePrice),
        globalMarginPct: globalMarginPct !== undefined && globalMarginPct !== '' ? parseFloat(globalMarginPct) : null,
        notes: notes || null,
      },
      include: { bulkPricingTiers: true },
    })
    return ok({ sku })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}
