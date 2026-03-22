import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Calendar, ChevronLeft } from 'lucide-react'
import AssignCrewForm from '@/components/workers/AssignCrewForm'

export default async function SchedulePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const role = session.role as string
  if (!['OWNER', 'PLATFORM_ADMIN', 'PROJECT_MANAGER'].includes(role)) redirect('/dashboard')

  const canAssign = ['OWNER', 'PLATFORM_ADMIN', 'PROJECT_MANAGER'].includes(role)

  const [crews, projects, assignments] = await Promise.all([
    prisma.crew.findMany({
      where: { isActive: true },
      include: {
        lead: { select: { firstName: true, lastName: true } },
        members: {
          include: { user: { select: { firstName: true, lastName: true, phone: true } } },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.project.findMany({
      where: { status: { in: ['APPROVED', 'SCHEDULED', 'IN_PROGRESS', 'PUNCH_LIST'] } },
      select: { id: true, name: true, status: true },
      orderBy: { name: 'asc' },
    }),
    prisma.crewProjectAssignment.findMany({
      include: {
        crew: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, status: true } },
      },
      orderBy: { startDate: 'desc' },
      take: 100,
    }),
  ])

  const now = new Date()

  // Split into active (end date in future or null) and past
  const activeAssignments = assignments.filter((a) => !a.endDate || new Date(a.endDate) >= now)
  const pastAssignments = assignments.filter((a) => a.endDate && new Date(a.endDate) < now)

  const serializedCrews = crews.map((c) => ({
    id: c.id,
    name: c.name,
    members: c.members.map((m) => ({
      user: { firstName: m.user.firstName, phone: m.user.phone },
    })),
  }))

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <div>
        <Link href="/workers" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit">
          <ChevronLeft size={16} />Workers
        </Link>
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-muted-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Crew Schedule</h1>
        </div>
      </div>

      {/* Current assignments */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">Active Assignments</h2>
        {activeAssignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active crew assignments.</p>
        ) : (
          <div className="space-y-2">
            {activeAssignments.map((a) => (
              <div key={a.id} className="bg-card border border-border rounded-lg px-4 py-3 text-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{a.crew.name}</span>
                      <span className="text-muted-foreground">on</span>
                      <Link href={`/projects/${a.project.id}`} className="text-primary hover:underline">{a.project.name}</Link>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(a.startDate).toLocaleDateString()} - {a.endDate ? new Date(a.endDate).toLocaleDateString() : 'TBD'}
                    </p>
                    {a.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{a.notes}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Crew roster */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">Crews ({crews.length})</h2>
        <div className="space-y-3">
          {crews.map((crew) => (
            <div key={crew.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-foreground">{crew.name}</p>
                {crew.lead && <p className="text-xs text-muted-foreground">Lead: {crew.lead.firstName} {crew.lead.lastName}</p>}
              </div>
              {crew.members.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {crew.members.map((m, i) => (
                    <span key={i} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                      {m.user.firstName} {m.user.lastName}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No members</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Assign crew to project */}
      {canAssign && projects.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3">Assign Crew to Project</h2>
          <div className="bg-card border border-border rounded-lg p-4">
            <AssignCrewForm
              projectId={projects[0].id}
              crews={serializedCrews}
              currentCrewId={null}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            To assign from a specific project page, go to the project and edit crew assignment.
          </p>
        </section>
      )}

      {pastAssignments.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3">Past Assignments</h2>
          <div className="space-y-2">
            {pastAssignments.slice(0, 10).map((a) => (
              <div key={a.id} className="bg-card border border-border rounded-lg px-4 py-2.5 text-sm opacity-60">
                <span className="text-foreground">{a.crew.name}</span>
                <span className="text-muted-foreground"> on </span>
                <span>{a.project.name}</span>
                <span className="text-muted-foreground text-xs ml-2">
                  {new Date(a.startDate).toLocaleDateString()} - {a.endDate ? new Date(a.endDate).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
