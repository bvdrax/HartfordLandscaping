import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, serverError, err } from '@/lib/api'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { Role } from '@prisma/client'

const ALLOWED_ROLES: Role[] = [Role.OWNER, Role.PROJECT_MANAGER, Role.PLATFORM_ADMIN, Role.ACCOUNTANT]

export async function GET(req: NextRequest) {
  try {
    requireSession(req)
    const includeInactive = req.nextUrl.searchParams.get('includeInactive') === 'true'
    const suppliers = await prisma.supplier.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: { _count: { select: { skus: true } } },
      orderBy: { name: 'asc' },
    })
    return ok({ suppliers })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, ALLOWED_ROLES)
    const { name, accountNumber, repName, repPhone, repEmail, notes } = await req.json()
    if (!name?.trim()) return err('Supplier name is required')
    const supplier = await prisma.supplier.create({
      data: { name: name.trim(), accountNumber: accountNumber || null, repName: repName || null, repPhone: repPhone || null, repEmail: repEmail || null, notes: notes || null },
    })
    return ok({ supplier })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}
