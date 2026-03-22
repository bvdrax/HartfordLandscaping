import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ChevronLeft, Pencil, Clock, Mail, Phone } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  FIELD_WORKER: 'Field Worker', PROJECT_MANAGER: 'Project Manager', ACCOUNTANT: 'Accountant',
  SUBCONTRACTOR: 'Subcontractor', OWNER: 'Owner', PLATFORM_ADMIN: 'Admin',
}

function fmtMins(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default async function WorkerDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const role = session.role as string
  if (!['OWNER', 'PLATFORM_ADMIN', 'PROJECT_MANAGER'].includes(role)) redirect('/dashboard')
  const canEdit = ['OWNER', 'PLATFORM_ADMIN'].includes(role)

  const worker = await prisma.workerProfile.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, isActive: true } },
      crew: { select: { id: true, name: true } },
    },
  })
  if (!worker) notFound()

  const timeLogs = await prisma.timeLog.findMany({
    where: { userId: worker.userId },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { clockInAt: 'desc' },
    take: 50,
  })

  const completedLogs = timeLogs.filter((l) => l.clockOutAt)
  const totalMinutes = completedLogs.reduce((s, l) => s + (l.totalMinutes ?? 0), 0)
  const earnings = worker.payType === 'HOURLY' && worker.hourlyRate
    ? (totalMinutes / 60) * Number(worker.hourlyRate)
    : null

  // Group hours by project
  const hoursByProject: Record<string, { name: string; minutes: number }> = {}
  for (const log of completedLogs) {
    if (!hoursByProject[log.projectId]) {
      hoursByProject[log.projectId] = { name: log.project.name, minutes: 0 }
    }
    hoursByProject[log.projectId].minutes += log.totalMinutes ?? 0
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <Link href="/workers" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit">
          <ChevronLeft size={16} />Workers
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{worker.user.firstName} {worker.user.lastName}</h1>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{ROLE_LABELS[worker.user.role] ?? worker.user.role}</span>
              {!worker.user.isActive && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Inactive</span>}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{worker.crew?.name ?? 'No crew'}</p>
          </div>
          {canEdit && (
            <Link href={`/workers/${worker.id}/edit`}
              className="flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm font-medium text-muted-foreground hover:text-foreground shrink-0">
              <Pencil size={14} />Edit
            </Link>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-2 text-sm">
        {worker.user.email && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail size={14} /><span>{worker.user.email}</span>
          </div>
        )}
        {worker.user.phone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone size={14} /><span>{worker.user.phone}</span>
          </div>
        )}
        {worker.hourlyRate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rate</span>
            <span>${Number(worker.hourlyRate).toFixed(2)}/hr ({worker.payType.toLowerCase()})</span>
          </div>
        )}
        {worker.emergencyContact && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Emergency</span>
            <span>{worker.emergencyContact}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Hours</p>
          <p className="text-xl font-bold text-foreground">{(totalMinutes / 60).toFixed(1)}h</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Sessions</p>
          <p className="text-xl font-bold text-foreground">{completedLogs.length}</p>
        </div>
        {earnings !== null && (
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Est. Earnings</p>
            <p className="text-xl font-bold text-foreground">${earnings.toFixed(0)}</p>
          </div>
        )}
      </div>

      {Object.keys(hoursByProject).length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3">Hours by Project</h2>
          <div className="space-y-2">
            {Object.entries(hoursByProject)
              .sort((a, b) => b[1].minutes - a[1].minutes)
              .map(([pid, data]) => (
                <div key={pid} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-2.5 text-sm">
                  <Link href={`/projects/${pid}`} className="text-foreground hover:text-primary truncate">{data.name}</Link>
                  <span className="text-muted-foreground shrink-0 ml-3 tabular-nums">{fmtMins(data.minutes)}</span>
                </div>
              ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">Recent Time Logs</h2>
        {timeLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No time logs yet.</p>
        ) : (
          <div className="space-y-2">
            {timeLogs.slice(0, 20).map((log) => (
              <div key={log.id} className="bg-card border border-border rounded-lg px-4 py-2.5 flex items-center justify-between text-sm">
                <div>
                  <p className="text-foreground">{log.project.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.clockInAt).toLocaleDateString()} {new Date(log.clockInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {log.clockOutAt ? ` - ${new Date(log.clockOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' (active)'}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                  <Clock size={12} />
                  <span className="tabular-nums">{log.totalMinutes ? fmtMins(log.totalMinutes) : '-'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
