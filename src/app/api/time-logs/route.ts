import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/middleware'
import { ok, err, serverError } from '@/lib/api'

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req)
    const role = session.role as string
    const { searchParams } = req.nextUrl
    const projectId = searchParams.get('projectId')
    const userId = searchParams.get('userId')

    // Field workers and subcontractors only see their own logs
    const isWorker = ['FIELD_WORKER', 'SUBCONTRACTOR'].includes(role)
    const where: Record<string, unknown> = {}
    if (isWorker) where.userId = session.userId
    else if (userId) where.userId = userId
    if (projectId) where.projectId = projectId

    const logs = await prisma.timeLog.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { clockInAt: 'desc' },
      take: 200,
    })

    return ok(logs)
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req)
    const body = await req.json()
    const { projectId, clockInAt, clockOutAt, breakMinutes, notes } = body

    if (!projectId || !clockInAt || !clockOutAt) {
      return err('projectId, clockInAt, and clockOutAt are required')
    }

    const inAt = new Date(clockInAt)
    const outAt = new Date(clockOutAt)
    const breakMins = parseInt(breakMinutes ?? '0') || 0
    const totalMinutes = Math.max(0, Math.round((outAt.getTime() - inAt.getTime()) / 60000) - breakMins)

    const log = await prisma.timeLog.create({
      data: {
        projectId,
        userId: session.userId,
        clockInAt: inAt,
        clockOutAt: outAt,
        breakMinutes: breakMins,
        totalMinutes,
        notes: notes ?? null,
      },
    })

    return ok(log)
  } catch (e) {
    return serverError(e)
  }
}
