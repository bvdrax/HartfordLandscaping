import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { ok, err, serverError } from '@/lib/api'
import { Role } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    requireSession(req)

    const workers = await prisma.workerProfile.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, isActive: true } },
        crew: { select: { id: true, name: true } },
      },
      orderBy: { user: { lastName: 'asc' } },
    })

    return ok(workers)
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, [Role.OWNER, Role.PLATFORM_ADMIN])

    const body = await req.json()
    const { firstName, lastName, email, phone, role, hourlyRate, payType, crewId, emergencyContact, notes } = body

    if (!firstName || !lastName || !email || !role) {
      return err('firstName, lastName, email, and role are required')
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return err('A user with this email already exists', 409)

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        role,
        isActive: true,
        workerProfile: {
          create: {
            hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
            payType: payType ?? 'HOURLY',
            crewId: crewId || null,
            emergencyContact: emergencyContact || null,
            notes: notes || null,
          },
        },
      },
      include: {
        workerProfile: {
          include: { crew: { select: { id: true, name: true } } },
        },
      },
    })

    return ok(user)
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}
