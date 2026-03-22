import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { ok, err, notFound, serverError } from '@/lib/api'
import { Role } from '@prisma/client'

function getId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/')
  return parts[parts.indexOf('workers') + 1] ?? ''
}

export async function GET(req: NextRequest) {
  try {
    requireSession(req)
    const id = getId(req)

    const worker = await prisma.workerProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, isActive: true } },
        crew: { select: { id: true, name: true } },
      },
    })
    if (!worker) return notFound('Worker')

    // Get recent time logs for this worker
    const timeLogs = await prisma.timeLog.findMany({
      where: { userId: worker.userId },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { clockInAt: 'desc' },
      take: 50,
    })

    const totalMinutes = timeLogs.filter((l) => l.clockOutAt).reduce((s, l) => s + (l.totalMinutes ?? 0), 0)

    return ok({ worker, timeLogs, totalMinutes })
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, [Role.OWNER, Role.PLATFORM_ADMIN])

    const id = getId(req)
    const worker = await prisma.workerProfile.findUnique({ where: { id }, include: { user: true } })
    if (!worker) return notFound('Worker')

    const body = await req.json()
    const { firstName, lastName, phone, role, hourlyRate, payType, crewId, isActive, emergencyContact, notes } = body

    // Update User fields
    await prisma.user.update({
      where: { id: worker.userId },
      data: {
        firstName: firstName ?? worker.user.firstName,
        lastName: lastName ?? worker.user.lastName,
        phone: phone !== undefined ? phone || null : worker.user.phone,
        role: role ?? worker.user.role,
        isActive: isActive !== undefined ? isActive : worker.user.isActive,
      },
    })

    // Update WorkerProfile fields
    const updated = await prisma.workerProfile.update({
      where: { id },
      data: {
        hourlyRate: hourlyRate !== undefined ? (hourlyRate ? parseFloat(hourlyRate) : null) : worker.hourlyRate,
        payType: payType ?? worker.payType,
        crewId: crewId !== undefined ? (crewId || null) : worker.crewId,
        isActive: isActive !== undefined ? isActive : worker.isActive,
        emergencyContact: emergencyContact !== undefined ? emergencyContact || null : worker.emergencyContact,
        notes: notes !== undefined ? notes || null : worker.notes,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, isActive: true } },
        crew: { select: { id: true, name: true } },
      },
    })

    return ok(updated)
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}
