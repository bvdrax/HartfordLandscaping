import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, notFound, serverError } from '@/lib/api'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { Role } from '@prisma/client'

const MGMT: Role[] = [Role.OWNER, Role.PROJECT_MANAGER, Role.PLATFORM_ADMIN]

function getIds(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/')
  return { lineItemId: parts.pop() ?? '', quoteId: parts[parts.indexOf('line-items') - 1] ?? '' }
}

async function recalcQuote(quoteId: string) {
  const items = await prisma.quoteLineItem.findMany({ where: { quoteId } })
  let materialsTotal = 0
  let laborTotal = 0
  for (const i of items) {
    materialsTotal += Number(i.quantity) * Number(i.unitPrice)
    laborTotal += Number(i.quantity) * Number(i.laborPricePerUnit)
  }
  const settings = await prisma.globalSettings.findUnique({ where: { id: 'singleton' } })
  const taxRate = Number(settings?.defaultTaxRate ?? 0)
  const taxTotal = (materialsTotal + laborTotal) * taxRate
  await prisma.quote.update({ where: { id: quoteId }, data: { materialsTotal, laborTotal, taxTotal, total: materialsTotal + laborTotal + taxTotal } })
}

export async function PATCH(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, MGMT)
    const { lineItemId, quoteId } = getIds(req)
    const existing = await prisma.quoteLineItem.findUnique({ where: { id: lineItemId } })
    if (!existing) return notFound('Line item')

    const { quantity, unitPrice, laborPricePerUnit, laborHoursPerUnit, description, marginPctOverride } = await req.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {}
    if (quantity !== undefined) data.quantity = parseFloat(quantity)
    if (unitPrice !== undefined) data.unitPrice = parseFloat(unitPrice)
    if (laborPricePerUnit !== undefined) data.laborPricePerUnit = parseFloat(laborPricePerUnit)
    if (laborHoursPerUnit !== undefined) data.laborHoursPerUnit = parseFloat(laborHoursPerUnit)
    if (description !== undefined) data.description = description.trim()
    if (marginPctOverride !== undefined) data.marginPctOverride = marginPctOverride !== '' && marginPctOverride !== null ? parseFloat(marginPctOverride) : null

    const qty = data.quantity ?? Number(existing.quantity)
    const up = data.unitPrice ?? Number(existing.unitPrice)
    const lp = data.laborPricePerUnit ?? Number(existing.laborPricePerUnit)
    data.lineTotal = qty * (up + lp)

    void session
    const lineItem = await prisma.quoteLineItem.update({ where: { id: lineItemId }, data, include: { sku: { select: { id: true, name: true, unitOfMeasure: true } } } })
    await recalcQuote(quoteId)
    return ok({ lineItem })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, MGMT)
    const { lineItemId, quoteId } = getIds(req)
    const existing = await prisma.quoteLineItem.findUnique({ where: { id: lineItemId } })
    if (!existing) return notFound('Line item')
    void session
    await prisma.quoteLineItem.delete({ where: { id: lineItemId } })
    await recalcQuote(quoteId)
    return ok({ deleted: true })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}
