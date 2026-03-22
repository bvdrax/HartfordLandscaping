import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Clock, Pencil } from 'lucide-react'
import ClockInButton from '@/components/time/ClockInButton'

function fmtMins(mins: number | null) {
  if (!mins) return '-'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function fmtTime(d: Date | string) {
  return new Date(d).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default async function TimePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const role = session.role as string
  const isWorker = ['FIELD_WORKER', 'SUBCONTRACTOR'].includes(role)
  const canEdit = ['OWNER', 'PROJECT_MANAGER', 'PLATFORM_ADMIN'].includes(role)

  const where = isWorker ? { userId: session.userId } : {}

  const [logs, activeProjects] = await Promise.all([
    prisma.timeLog.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { clockInAt: 'desc' },
      take: 100,
    }),
    prisma.project.findMany({
      where: { status: { in: ['SCHEDULED', 'IN_PROGRESS', 'PUNCH_LIST'] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  // Compute total hours this week
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const weekLogs = logs.filter((l) => new Date(l.clockInAt) >= weekStart && l.clockOutAt)
  const weekMins = weekLogs.reduce((sum, l) => sum + (l.totalMinutes ?? 0), 0)

  const serializedProjects = activeProjects.map((p) => ({ id: p.id, name: p.name }))

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Clock size={20} className="text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Time Tracking</h1>
      </div>

      {/* Week summary */}
      <div className="bg-card border border-border rounded-lg p-4 flex gap-6">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">This Week</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">{fmtMins(weekMins)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Entries</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">{logs.filter((l) => l.clockOutAt).length}</p>
        </div>
      </div>

      {/* Clock in/out widget */}
      <ClockInButton projects={serializedProjects} />

      {/* Log list */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">Recent Logs</h2>
        {logs.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground">No time logs yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="bg-card border border-border rounded-lg px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{log.project.name}</p>
                    {!isWorker && (
                      <p className="text-xs text-muted-foreground">{log.user.firstName} {log.user.lastName}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmtDate(log.clockInAt)} {fmtTime(log.clockInAt)}
                      {log.clockOutAt ? ` - ${fmtTime(log.clockOutAt)}` : ' (active)'}
                    </p>
                    {log.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{log.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground tabular-nums">{fmtMins(log.totalMinutes)}</p>
                      {log.breakMinutes > 0 && (
                        <p className="text-xs text-muted-foreground">{log.breakMinutes}m break</p>
                      )}
                      {log.approvedAt && (
                        <p className="text-xs text-green-600 dark:text-green-400">Approved</p>
                      )}
                    </div>
                    {canEdit && (
                      <Link
                        href={`/time/${log.id}/edit`}
                        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Pencil size={13} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
