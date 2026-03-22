import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/middleware'
import { ok, serverError } from '@/lib/api'

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req)

    const active = await prisma.timeLog.findFirst({
      where: { userId: session.userId, clockOutAt: null },
      include: { project: { select: { id: true, name: true } } },
    })

    return ok(active ?? null)
  } catch (e) {
    return serverError(e)
  }
}
