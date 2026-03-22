import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/middleware'
import { ok, err, serverError } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req)
    const body = await req.json()
    const { location, breakMinutes, notes } = body

    const active = await prisma.timeLog.findFirst({
      where: { userId: session.userId, clockOutAt: null },
    })
    if (!active) return err('Not currently clocked in', 409)

    const now = new Date()
    const breakMins = parseInt(breakMinutes ?? '0') || 0
    const totalMinutes = Math.max(
      0,
      Math.round((now.getTime() - active.clockInAt.getTime()) / 60000) - breakMins
    )

    const log = await prisma.timeLog.update({
      where: { id: active.id },
      data: {
        clockOutAt: now,
        clockOutLocation: location ?? null,
        breakMinutes: breakMins,
        totalMinutes,
        notes: notes ?? null,
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    })

    return ok(log)
  } catch (e) {
    return serverError(e)
  }
}
