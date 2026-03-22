import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, serverError } from '@/lib/api'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { Role } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    requireSession(req)
    const settings = await prisma.globalSettings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
    })
    return ok({ settings })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, [Role.OWNER, Role.PLATFORM_ADMIN])
    const { defaultMarginPct, defaultTaxRate, companyName, companyPhone, companyEmail, companyAddress } = await req.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {}
    if (defaultMarginPct !== undefined) data.defaultMarginPct = parseFloat(defaultMarginPct)
    if (defaultTaxRate !== undefined) data.defaultTaxRate = parseFloat(defaultTaxRate)
    if (companyName !== undefined) data.companyName = companyName || 'Hartford Landscaping'
    if (companyPhone !== undefined) data.companyPhone = companyPhone || null
    if (companyEmail !== undefined) data.companyEmail = companyEmail || null
    if (companyAddress !== undefined) data.companyAddress = companyAddress || null
    const settings = await prisma.globalSettings.upsert({
      where: { id: 'singleton' },
      update: data,
      create: { id: 'singleton', ...data },
    })
    return ok({ settings })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}
