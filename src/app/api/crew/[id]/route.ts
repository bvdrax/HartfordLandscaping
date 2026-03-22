import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { ok, err, notFound, serverError } from '@/lib/api'
import { Role } from '@prisma/client'

function getId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/')
  return parts[parts.indexOf('crew') + 1] ?? ''
}

export async function GET(req: NextRequest) {
  try {
    requireSession(req)
    const id = getId(req)

    const crew = await prisma.crew.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true, phone: true } },
          },
        },
        projectAssignments: {
          include: { project: { select: { id: true, name: true, status: true } } },
          orderBy: { startDate: 'desc' },
        },
      },
    })
    if (!crew) return notFound('Crew')

    return ok(crew)
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, [Role.OWNER, Role.PLATFORM_ADMIN, Role.PROJECT_MANAGER])

    const id = getId(req)
    const crew = await prisma.crew.findUnique({ where: { id } })
    if (!crew) return notFound('Crew')

    const body = await req.json()
    const { name, leadWorkerId, isActive, memberWorkerProfileIds } = body

    await prisma.crew.update({
      where: { id },
      data: {
        name: name ?? crew.name,
        leadWorkerId: leadWorkerId !== undefined ? (leadWorkerId || null) : crew.leadWorkerId,
        isActive: isActive !== undefined ? isActive : crew.isActive,
        // Replace members by updating each WorkerProfile's crewId
      },
    })

    // Update member assignments if provided
    if (memberWorkerProfileIds && Array.isArray(memberWorkerProfileIds)) {
      // Remove existing members
      await prisma.workerProfile.updateMany({
        where: { crewId: id },
        data: { crewId: null },
      })
      // Add new members
      if (memberWorkerProfileIds.length > 0) {
        await prisma.workerProfile.updateMany({
          where: { id: { in: memberWorkerProfileIds } },
          data: { crewId: id },
        })
      }
    }

    const result = await prisma.crew.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
      },
    })

    return ok(result)
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}
