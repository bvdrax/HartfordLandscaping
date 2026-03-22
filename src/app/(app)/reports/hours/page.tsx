import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ChevronLeft, Download, Clock } from 'lucide-react'

export default async function WorkerHoursPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!['OWNER', 'PLATFORM_ADMIN', 'ACCOUNTANT', 'PROJECT_MANAGER'].includes(session.role as string)) redirect('/dashboard')

  const from = searchParams.from
  const to = searchParams.to

  const where: Record<string, unknown> = { clockOutAt: { not: null } }
  if (from || to) {
    where.clockInAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
    }
  }

  const logs = await prisma.timeLog.findMany({
    where,
    include: {
      user: { include: { workerProfile: { select: { hourlyRate: true, payType: true } } } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { clockInAt: 'desc' },
  })

  // Aggregate by worker
  const byWorker: Record<string, {
    name: string; role: string; payType: string; rate: number
    minutes: number; sessions: number; earnings: number
    projects: Record<string, { name: string; minutes: number }>
  }> = {}

  for (const log of logs) {
    const uid = log.userId
    const rate = Number(log.user.workerProfile?.hourlyRate ?? 0)
    const hrs = (log.totalMinutes ?? 0) / 60
    if (!byWorker[uid]) {
      byWorker[uid] = {
        name: `${log.user.firstName} ${log.user.lastName}`,
        role: log.user.role,
        payType: log.user.workerProfile?.payType ?? 'HOURLY',
        rate,
        minutes: 0, sessions: 0, earnings: 0,
        projects: {},
      }
    }
    byWorker[uid].minutes += log.totalMinutes ?? 0
    byWorker[uid].sessions++
    byWorker[uid].earnings += hrs * rate
    if (!byWorker[uid].projects[log.projectId]) {
      byWorker[uid].projects[log.projectId] = { name: log.project.name, minutes: 0 }
    }
    byWorker[uid].projects[log.projectId].minutes += log.totalMinutes ?? 0
  }

  function fmtHrs(mins: number) {
    return (mins / 60).toFixed(1) + 'h'
  }

  const exportParams = new URLSearchParams({ type: 'hours', ...(from ? { from } : {}), ...(to ? { to } : {}) })

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <Link href="/reports" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit">
          <ChevronLeft size={16} />Reports
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-muted-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Worker Hours</h1>
          </div>
          <a href={`/api/reports/export?${exportParams}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Download size={14} />CSV
          </a>
        </div>
      </div>

      {/* Date filters */}
      <form className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">From</label>
          <input type="date" name="from" defaultValue={from}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">To</label>
          <input type="date" name="to" defaultValue={to}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <button type="submit" className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Filter
        </button>
        {(from || to) && (
          <Link href="/reports/hours" className="text-sm text-muted-foreground hover:text-foreground">Clear</Link>
        )}
      </form>

      <p className="text-sm text-muted-foreground">{logs.length} time log entries</p>

      {Object.keys(byWorker).length === 0 ? (
        <p className="text-sm text-muted-foreground">No time logs for this period.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(byWorker)
            .sort((a, b) => b[1].minutes - a[1].minutes)
            .map(([, w]) => (
              <div key={w.name} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-foreground">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{w.role.replace('_', ' ')} - {w.payType.toLowerCase()}{w.rate > 0 ? ` $${w.rate.toFixed(2)}/hr` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{fmtHrs(w.minutes)}</p>
                    {w.earnings > 0 && <p className="text-sm text-muted-foreground">${w.earnings.toFixed(2)} est.</p>}
                  </div>
                </div>
                <div className="space-y-1">
                  {Object.entries(w.projects).sort((a, b) => b[1].minutes - a[1].minutes).map(([pid, proj]) => (
                    <div key={pid} className="flex items-center justify-between text-sm">
                      <Link href={`/projects/${pid}`} className="text-muted-foreground hover:text-foreground">{proj.name}</Link>
                      <span className="text-muted-foreground tabular-nums">{fmtHrs(proj.minutes)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
