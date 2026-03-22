import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, notFound, serverError, err } from '@/lib/api'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { Role } from '@prisma/client'

const MANAGEMENT_ROLES: Role[] = [Role.OWNER, Role.PROJECT_MANAGER, Role.PLATFORM_ADMIN]

function getId(req: NextRequest): string {
  return req.nextUrl.pathname.split('/').pop() ?? ''
}

export async function GET(req: NextRequest) {
  try {
    const session = requireSession(req)
    const id = getId(req)

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        customers: true,
        crew: { select: { id: true, name: true } },
        projectManager: { select: { id: true, firstName: true, lastName: true } },
        tasks: { orderBy: { createdAt: 'asc' } },
        _count: { select: { photos: true, quotes: true, invoices: true } },
      },
    })

    if (!project) return notFound('Project')

    // Field workers can only view projects assigned to their crew
    if (session.role === Role.FIELD_WORKER || session.role === Role.SUBCONTRACTOR) {
      const worker = await prisma.workerProfile.findUnique({ where: { userId: session.userId } })
      if (project.crewId !== worker?.crewId) {
        return NextResponse.json({ data: null, error: 'Forbidden', meta: null }, { status: 403 })
      }
    }

    return ok({ project })
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    }
    return serverError(e)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, MANAGEMENT_ROLES)
    const id = getId(req)

    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) return notFound('Project')

    const body = await req.json()
    const {
      name, projectType, status, street, city, state, zip,
      startDate, estimatedEndDate, estimatedHours,
      crewId, projectManagerId, globalMarginOverride,
      notes, internalNotes,
    } = body

    if (name !== undefined && !name?.trim()) return err('Project name is required')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {}
    if (name !== undefined) data.name = name.trim()
    if (projectType !== undefined) data.projectType = projectType
    if (status !== undefined) data.status = status
    if (street !== undefined || city !== undefined || state !== undefined || zip !== undefined) {
      const current = (project.siteAddress ?? {}) as Record<string, string>
      data.siteAddress = {
        street: street ?? current.street ?? '',
        city: city ?? current.city ?? '',
        state: state ?? current.state ?? '',
        zip: zip ?? current.zip ?? '',
      }
    }
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null
    if (estimatedEndDate !== undefined) data.estimatedEndDate = estimatedEndDate ? new Date(estimatedEndDate) : null
    if (estimatedHours !== undefined) data.estimatedHours = estimatedHours ? parseFloat(estimatedHours) : null
    if (crewId !== undefined) data.crewId = crewId || null
    if (projectManagerId !== undefined) data.projectManagerId = projectManagerId || null
    if (globalMarginOverride !== undefined) data.globalMarginOverride = globalMarginOverride !== null ? parseFloat(globalMarginOverride) : null
    if (notes !== undefined) data.notes = notes || null
    if (internalNotes !== undefined) data.internalNotes = internalNotes || null

    const updated = await prisma.project.update({ where: { id }, data })
    return ok({ project: updated })
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    }
    return serverError(e)
  }
}
