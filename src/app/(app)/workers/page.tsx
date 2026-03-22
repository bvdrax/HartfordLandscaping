import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Users, Plus, Clock } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  FIELD_WORKER: 'Field Worker', PROJECT_MANAGER: 'PM', ACCOUNTANT: 'Accountant',
  SUBCONTRACTOR: 'Sub', OWNER: 'Owner', PLATFORM_ADMIN: 'Admin',
}

const PAY_LABELS: Record<string, string> = {
  HOURLY: 'Hourly', SALARY: 'Salary', SUBCONTRACT: 'Subcontract',
}

export default async function WorkersPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const role = session.role as string
  const canManage = ['OWNER', 'PLATFORM_ADMIN'].includes(role)
  if (!['OWNER', 'PLATFORM_ADMIN', 'PROJECT_MANAGER'].includes(role)) redirect('/dashboard')

  const workers = await prisma.workerProfile.findMany({
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, isActive: true } },
      crew: { select: { id: true, name: true } },
    },
    orderBy: { user: { lastName: 'asc' } },
  })

  // Get this week's hours per worker
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const weekLogs = await prisma.timeLog.findMany({
    where: { clockInAt: { gte: weekStart }, clockOutAt: { not: null } },
    select: { userId: true, totalMinutes: true },
  })

  const weekMinsByUser: Record<string, number> = {}
  for (const log of weekLogs) {
    weekMinsByUser[log.userId] = (weekMinsByUser[log.userId] ?? 0) + (log.totalMinutes ?? 0)
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-muted-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Workers</h1>
        </div>
        {canManage && (
          <Link href="/workers/new"
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={16} />New Worker
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Workers</p>
          <p className="text-2xl font-bold text-foreground">{workers.filter((w) => w.user.isActive).length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Workers</p>
          <p className="text-2xl font-bold text-foreground">{workers.length}</p>
        </div>
      </div>

      {workers.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <Users size={32} className="mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No workers yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {workers.map((w) => {
            const weekMins = weekMinsByUser[w.userId] ?? 0
            const weekHrs = (weekMins / 60).toFixed(1)
            return (
              <Link key={w.id} href={`/workers/${w.id}`}
                className={`flex items-center justify-between bg-card border rounded-lg px-4 py-3 hover:border-primary/50 transition-colors ${!w.user.isActive ? 'opacity-60 border-border' : 'border-border'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">
                      {w.user.firstName} {w.user.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {ROLE_LABELS[w.user.role] ?? w.user.role}
                    </span>
                    {!w.user.isActive && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Inactive</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {w.crew?.name ?? 'No crew'}
                    {w.hourlyRate ? ` - ${PAY_LABELS[w.payType]} $${Number(w.hourlyRate).toFixed(2)}/hr` : w.payType === 'SUBCONTRACT' ? ' - Subcontract' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Clock size={12} />
                  {weekHrs}h this week
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <div className="pt-2">
        <Link href="/workers/schedule" className="text-sm text-primary hover:underline">
          View crew schedule
        </Link>
      </div>
    </div>
  )
}
