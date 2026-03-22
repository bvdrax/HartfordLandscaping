import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, serverError, err } from '@/lib/api'
import { withAuth } from '@/lib/middleware'
import { Role, ProjectStatus, ProjectType } from '@prisma/client'

export const GET = withAuth(async (req: NextRequest, session) => {
  try {
    const { searchParams } = req.nextUrl
    const status = searchParams.get('status') as ProjectStatus | null
    const type = searchParams.get('type') as ProjectType | null
    const search = searchParams.get('search') ?? ''
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20'))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (status) where.status = status
    if (type) where.projectType = type
    if (search) where.name = { contains: search, mode: 'insensitive' }

    // Field workers and subcontractors only see their crew's projects
    if (session.role === Role.FIELD_WORKER || session.role === Role.SUBCONTRACTOR) {
      const worker = await prisma.workerProfile.findUnique({ where: { userId: session.userId } })
      if (worker?.crewId) {
        where.crewId = worker.crewId
      } else {
        return ok({ projects: [], total: 0, page, limit })
      }
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          customers: { where: { isPrimary: true }, take: 1 },
          crew: { select: { id: true, name: true } },
          projectManager: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { tasks: true, photos: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.project.count({ where }),
    ])

    return ok({ projects, total, page, limit })
  } catch (e) {
    return serverError(e)
  }
})

export const POST = withAuth(async (req: NextRequest, session) => {
  try {
    const body = await req.json()
    const {
      name, projectType, street, city, state, zip,
      startDate, estimatedEndDate, estimatedHours,
      crewId, projectManagerId, notes, internalNotes,
    } = body

    if (!name?.trim()) return err('Project name is required')
    if (!projectType) return err('Project type is required')

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        status: ProjectStatus.LEAD,
        projectType,
        siteAddress: { street: street ?? '', city: city ?? '', state: state ?? '', zip: zip ?? '' },
        startDate: startDate ? new Date(startDate) : null,
        estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : null,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        crewId: crewId || null,
        projectManagerId: projectManagerId || session.userId,
        notes: notes || null,
        internalNotes: internalNotes || null,
      },
    })

    return ok({ project })
  } catch (e) {
    return serverError(e)
  }
}, [Role.OWNER, Role.PROJECT_MANAGER, Role.PLATFORM_ADMIN])
