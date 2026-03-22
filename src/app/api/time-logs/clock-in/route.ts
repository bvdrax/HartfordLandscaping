import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/middleware'
import { ok, err, serverError } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req)
    const body = await req.json()
    const { projectId, location } = body

    if (!projectId) return err('projectId is required')

    // Check if already clocked in
    const active = await prisma.timeLog.findFirst({
      where: { userId: session.userId, clockOutAt: null },
    })
    if (active) return err('Already clocked in to a project', 409)

    // Validate project exists
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return err('Project not found', 404)

    // Get worker's crewId if applicable
    const worker = await prisma.workerProfile.findUnique({ where: { userId: session.userId } })

    const log = await prisma.timeLog.create({
      data: {
        projectId,
        userId: session.userId,
        crewId: worker?.crewId ?? null,
        clockInAt: new Date(),
        clockInLocation: location ?? null,
      },
    })

    return ok(log)
  } catch (e) {
    return serverError(e)
  }
}
