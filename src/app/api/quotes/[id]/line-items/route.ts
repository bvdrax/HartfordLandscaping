import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, notFound, serverError, err } from '@/lib/api'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { Role } from '@prisma/client'

const MGMT: Role[] = [Role.OWNER, Role.PROJECT_MANAGER, Role.PLATFORM_ADMIN]

function getQuoteId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/')
  const idx = parts.indexOf('line-items')
  return idx > 0 ? parts[idx - 1] : ''
}

function calcTotals(lineItems: { quantity: number; unitPrice: number; laborPricePerUnit: number }[]) {
  let materialsTotal = 0
  let laborTotal = 0
  for (const li of lineItems) {
    materialsTotal += li.quantity * li.unitPrice
    laborTotal += li.quantity * li.laborPricePerUnit
  }
  return { materialsTotal, laborTotal }
}

async function recalcQuote(quoteId: string) {
  const items = await prisma.quoteLineItem.findMany({ where: { quoteId } })
  const { materialsTotal, laborTotal } = calcTotals(
    items.map((i) => ({ quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), laborPricePerUnit: Number(i.laborPricePerUnit) }))
  )
  const settings = await prisma.globalSettings.findUnique({ where: { id: 'singleton' } })
  const taxRate = Number(settings?.defaultTaxRate ?? 0)
  const taxTotal = (materialsTotal + laborTotal) * taxRate
  const total = materialsTotal + laborTotal + taxTotal
  await prisma.quote.update({
    where: { id: quoteId },
    data: { materialsTotal, laborTotal, taxTotal, total },
  })
}

export async function POST(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, MGMT)
    const quoteId = getQuoteId(req)
    const quote = await prisma.quote.findUnique({ where: { id: quoteId } })
    if (!quote) return notFound('Quote')
    if (quote.status !== 'DRAFT') return err('Quote is not in DRAFT status')

    const { skuId, description, quantity, unitPrice, laborPricePerUnit, laborHoursPerUnit, marginPctOverride } = await req.json()
    if (!description?.trim()) return err('Description is required')
    if (!quantity || isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) return err('Valid quantity is required')

    let resolvedUnitPrice = unitPrice !== undefined ? parseFloat(unitPrice) : 0
    let resolvedDescription = description.trim()

    // If SKU provided, look up and apply margin
    if (skuId) {
      const sku = await prisma.sku.findUnique({ where: { id: skuId } })
      if (!sku) return err('SKU not found')
      if (!resolvedDescription) resolvedDescription = sku.name
      if (unitPrice === undefined || unitPrice === '') {
        const effectiveMargin = Number(marginPctOverride ?? sku.globalMarginPct ?? quote.globalMarginPct)
        resolvedUnitPrice = Number(sku.basePrice) * (1 + effectiveMargin / 100)
      }
    }

    const lastItem = await prisma.quoteLineItem.findFirst({ where: { quoteId }, orderBy: { sortOrder: 'desc' } })
    const sortOrder = (lastItem?.sortOrder ?? -1) + 1

    const lineItem = await prisma.quoteLineItem.create({
      data: {
        quoteId,
        skuId: skuId || null,
        description: resolvedDescription,
        quantity: parseFloat(quantity),
        unitPrice: resolvedUnitPrice,
        laborPricePerUnit: laborPricePerUnit ? parseFloat(laborPricePerUnit) : 0,
        laborHoursPerUnit: laborHoursPerUnit ? parseFloat(laborHoursPerUnit) : 0,
        marginPctOverride: marginPctOverride !== undefined && marginPctOverride !== '' ? parseFloat(marginPctOverride) : null,
        lineTotal: parseFloat(quantity) * (resolvedUnitPrice + (laborPricePerUnit ? parseFloat(laborPricePerUnit) : 0)),
        sortOrder,
      },
      include: { sku: { select: { id: true, name: true, unitOfMeasure: true } } },
    })

    await recalcQuote(quoteId)
    return ok({ lineItem })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}
