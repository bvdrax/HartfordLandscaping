import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, serverError } from '@/lib/api'
import { requireSession, ApiError } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  try {
    const session = requireSession(req)
    const roleStr = session.role as string
    const status = req.nextUrl.searchParams.get('status') ?? undefined
    const search = req.nextUrl.searchParams.get('search') ?? ''

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (status) where.status = status
    if (search) where.project = { name: { contains: search, mode: 'insensitive' } }
    if (roleStr === 'FIELD_WORKER' || roleStr === 'SUBCONTRACTOR') {
      const worker = await prisma.workerProfile.findUnique({ where: { userId: session.userId } })
      if (worker?.crewId) where.project = { ...where.project, crewId: worker.crewId }
    }

    const quotes = await prisma.quote.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        _count: { select: { lineItems: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    })
    return ok({ quotes })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}
