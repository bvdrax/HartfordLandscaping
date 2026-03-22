import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, notFound, serverError } from '@/lib/api'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { Role } from '@prisma/client'

const MGMT: Role[] = [Role.OWNER, Role.PROJECT_MANAGER, Role.PLATFORM_ADMIN]

function getProjectId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/')
  const idx = parts.indexOf('quotes')
  return idx > 0 ? parts[idx - 1] : ''
}

export async function GET(req: NextRequest) {
  try {
    requireSession(req)
    const projectId = getProjectId(req)
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })
    if (!project) return notFound('Project')
    const quotes = await prisma.quote.findMany({
      where: { projectId },
      include: { _count: { select: { lineItems: true } } },
      orderBy: [{ versionNumber: 'desc' }],
    })
    return ok({ quotes })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, MGMT)
    const projectId = getProjectId(req)
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, globalMarginOverride: true } })
    if (!project) return notFound('Project')

    const { notes, termsAndConditions } = await req.json().catch(() => ({}))

    // Get the next version number
    const lastQuote = await prisma.quote.findFirst({ where: { projectId }, orderBy: { versionNumber: 'desc' } })
    const versionNumber = (lastQuote?.versionNumber ?? 0) + 1

    // Get global margin setting
    const settings = await prisma.globalSettings.findUnique({ where: { id: 'singleton' } })
    const globalMarginPct = project.globalMarginOverride ?? settings?.defaultMarginPct ?? 30

    const quote = await prisma.quote.create({
      data: {
        projectId,
        versionNumber,
        globalMarginPct,
        notes: notes || null,
        termsAndConditions: termsAndConditions || null,
      },
    })
    return ok({ quote })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}
