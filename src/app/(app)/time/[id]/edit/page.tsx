import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import TimeLogEditForm from '@/components/time/TimeLogEditForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function TimeLogEditPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const role = session.role as string
  const canEdit = ['OWNER', 'PROJECT_MANAGER', 'PLATFORM_ADMIN'].includes(role)
  if (!canEdit) redirect('/time')

  const log = await prisma.timeLog.findUnique({
    where: { id: params.id },
    include: {
      project: { select: { id: true, name: true } },
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  })
  if (!log) notFound()

  const serialized = {
    id: log.id,
    projectId: log.projectId,
    projectName: log.project.name,
    userName: `${log.user.firstName} ${log.user.lastName}`,
    clockInAt: log.clockInAt.toISOString(),
    clockOutAt: log.clockOutAt?.toISOString() ?? null,
    breakMinutes: log.breakMinutes,
    totalMinutes: log.totalMinutes,
    notes: log.notes ?? '',
    approvedAt: log.approvedAt?.toISOString() ?? null,
  }

  const canApprove = ['OWNER', 'PLATFORM_ADMIN'].includes(role)

  return (
    <div className="p-6 space-y-6 max-w-lg">
      <div>
        <Link href="/time" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit">
          <ChevronLeft size={16} />Time Logs
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Edit Time Log</h1>
        <p className="text-sm text-muted-foreground mt-1">{log.project.name} - {log.user.firstName} {log.user.lastName}</p>
      </div>

      <TimeLogEditForm log={serialized} canApprove={canApprove} />
    </div>
  )
}
