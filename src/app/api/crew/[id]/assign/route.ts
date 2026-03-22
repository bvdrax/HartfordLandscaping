import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { ok, err, serverError } from '@/lib/api'
import { Role } from '@prisma/client'
import { sendSms, formatScheduleSms } from '@/lib/sms'

function getCrewId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/')
  return parts[parts.indexOf('crew') + 1] ?? ''
}

export async function POST(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, [Role.OWNER, Role.PLATFORM_ADMIN, Role.PROJECT_MANAGER])

    const crewId = getCrewId(req)
    const body = await req.json()
    const { projectId, startDate, endDate, notes, notifyWorkers } = body

    if (!projectId || !startDate) return err('projectId and startDate are required')

    const [crew, project] = await Promise.all([
      prisma.crew.findUnique({
        where: { id: crewId },
        include: {
          members: {
            include: { user: { select: { firstName: true, phone: true } } },
          },
        },
      }),
      prisma.project.findUnique({ where: { id: projectId }, select: { id: true, name: true } }),
    ])

    if (!crew) return err('Crew not found', 404)
    if (!project) return err('Project not found', 404)

    const startDt = new Date(startDate)
    const endDt = endDate ? new Date(endDate) : null

    // Upsert crew-project assignment
    const assignment = await prisma.crewProjectAssignment.upsert({
      where: { crewId_projectId: { crewId, projectId } },
      update: { startDate: startDt, endDate: endDt, notes: notes || null },
      create: { crewId, projectId, startDate: startDt, endDate: endDt, notes: notes || null },
    })

    // Update project's crewId
    await prisma.project.update({ where: { id: projectId }, data: { crewId } })

    // Send SMS to crew members if requested
    const smsResults: { name: string; success: boolean; error?: string }[] = []
    if (notifyWorkers) {
      for (const member of crew.members) {
        if (member.user.phone) {
          try {
            const msg = formatScheduleSms(member.user.firstName, project.name, startDt, endDt)
            await sendSms(member.user.phone, msg)
            smsResults.push({ name: member.user.firstName, success: true })
          } catch (smsErr) {
            smsResults.push({ name: member.user.firstName, success: false, error: String(smsErr) })
          }
        }
      }
    }

    return ok({ assignment, smsResults })
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}
