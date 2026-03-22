import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/middleware'
import { ok, err, notFound, serverError } from '@/lib/api'
import { writeAudit } from '@/lib/audit'
import { TimeLogPatchSchema, parseBody } from '@/lib/validation'

function getId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/')
  return parts[parts.indexOf('time-logs') + 1] ?? ''
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req)
    const id = getId(req)
    const log = await prisma.timeLog.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })
    if (!log) return notFound('TimeLog')
    const role = session.role as string
    const isWorker = ['FIELD_WORKER', 'SUBCONTRACTOR'].includes(role)
    if (isWorker && log.userId !== session.userId) return err('Forbidden', 403)
    return ok(log)
  } catch (e) {
    return serverError(e)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession(req)
    const role = session.role as string
    const id = getId(req)

    const log = await prisma.timeLog.findUnique({ where: { id } })
    if (!log) return notFound('TimeLog')

    const isWorker = ['FIELD_WORKER', 'SUBCONTRACTOR'].includes(role)
    if (isWorker && log.userId !== session.userId) return err('Forbidden', 403)

    const rawBody = await req.json()
    const parsed = parseBody(TimeLogPatchSchema, rawBody)
    if (!parsed.success) return err(parsed.error)
    const { clockInAt, clockOutAt, breakMinutes, notes, approved } = parsed.data

    const inAt = clockInAt ? new Date(clockInAt) : log.clockInAt
    const outAt = clockOutAt ? new Date(clockOutAt) : log.clockOutAt
    const breakMins = breakMinutes !== undefined ? parseInt(String(breakMinutes)) : log.breakMinutes

    let totalMinutes = log.totalMinutes
    if (outAt) {
      totalMinutes = Math.max(0, Math.round((outAt.getTime() - inAt.getTime()) / 60000) - breakMins)
    }

    const canApprove = ['OWNER', 'PROJECT_MANAGER', 'PLATFORM_ADMIN'].includes(role)
    const approvalData = approved && canApprove
      ? { approvedByUserId: session.userId, approvedAt: new Date() }
      : {}

    const updated = await prisma.timeLog.update({
      where: { id },
      data: {
        clockInAt: inAt,
        clockOutAt: outAt ?? undefined,
        breakMinutes: breakMins,
        totalMinutes,
        notes: notes !== undefined ? notes : log.notes,
        ...approvalData,
      },
    })

    if (approved && canApprove && !log.approvedByUserId) {
      await writeAudit({
        entityType: 'TimeLog', entityId: id, action: 'APPROVED',
        changedByUserId: session.userId,
        before: { approved: false }, after: { approved: true },
      })
    }

    return ok(updated)
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSession(req)
    const role = session.role as string
    const canDelete = ['OWNER', 'PLATFORM_ADMIN'].includes(role)
    if (!canDelete) return err('Forbidden', 403)

    const id = getId(req)
    const log = await prisma.timeLog.findUnique({ where: { id } })
    if (!log) return notFound('TimeLog')

    await prisma.timeLog.delete({ where: { id } })
    return ok({ deleted: true })
  } catch (e) {
    return serverError(e)
  }
}
