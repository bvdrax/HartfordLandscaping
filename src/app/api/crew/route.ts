import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { ok, err, serverError } from '@/lib/api'
import { Role } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    requireSession(req)

    const crews = await prisma.crew.findMany({
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
        _count: { select: { projects: true } },
      },
      orderBy: { name: 'asc' },
    })

    return ok(crews)
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, [Role.OWNER, Role.PLATFORM_ADMIN, Role.PROJECT_MANAGER])

    const body = await req.json()
    const { name, leadWorkerId } = body
    if (!name) return err('name is required')

    const crew = await prisma.crew.create({
      data: {
        name,
        leadWorkerId: leadWorkerId || null,
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
        members: true,
      },
    })

    return ok(crew)
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}
