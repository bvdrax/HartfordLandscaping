import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Plus, MapPin, Calendar, Users } from 'lucide-react'
import StatusBadge from '@/components/projects/StatusBadge'
import ProjectFilters from '@/components/projects/ProjectFilters'
import { Suspense } from 'react'

interface SiteAddress { street?: string; city?: string; state?: string; zip?: string }
interface SearchParams { status?: string; search?: string }

const TYPE_LABELS: Record<string, string> = {
  RESIDENTIAL: 'Residential', COMMERCIAL: 'Commercial', HOA: 'HOA', BUILDER: 'Builder',
}

export default async function ProjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const roleStr = session.role as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (searchParams.status) where.status = searchParams.status
  if (searchParams.search) where.name = { contains: searchParams.search, mode: 'insensitive' }

  if (roleStr === 'FIELD_WORKER' || roleStr === 'SUBCONTRACTOR') {
    const worker = await prisma.workerProfile.findUnique({ where: { userId: session.userId } })
    if (worker?.crewId) where.crewId = worker.crewId
    else return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground">Projects</h1>
        <p className="text-muted-foreground mt-2">No crew assigned.</p>
      </div>
    )
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        customers: { where: { isPrimary: true }, take: 1 },
        crew: { select: { name: true } },
        projectManager: { select: { firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    prisma.project.count({ where }),
  ])

  const canCreate = ['OWNER', 'PROJECT_MANAGER', 'PLATFORM_ADMIN'].includes(roleStr)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} project{total !== 1 ? 's' : ''}</p>
        </div>
        {canCreate && (
          <Link href="/projects/new" className="flex items-center gap-2 px-4 py-2 rounded-md text-white text-sm font-semibold" style={{ backgroundColor: '#2D6A4F' }}>
            <Plus size={16} />
            New Project
          </Link>
        )}
      </div>

      <Suspense>
        <ProjectFilters />
      </Suspense>

      {projects.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No projects found</p>
          {canCreate && (
            <Link href="/projects/new" className="mt-3 inline-block text-sm underline text-primary">Create your first project</Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => {
            const addr = (project.siteAddress ?? {}) as SiteAddress
            const primaryCustomer = project.customers[0]
            const addrLine = [addr.city, addr.state].filter(Boolean).join(', ')
            return (
              <Link key={project.id} href={`/projects/${project.id}`} className="block bg-card border border-border rounded-lg p-4 hover:border-primary/50 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2">{project.name}</h3>
                  <StatusBadge status={project.status} />
                </div>
                <div className="space-y-1.5">
                  {primaryCustomer && <p className="text-xs text-muted-foreground">{primaryCustomer.firstName} {primaryCustomer.lastName}</p>}
                  {addrLine && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin size={12} />
                      {addrLine}
                    </div>
                  )}
                  {project.startDate && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar size={12} />
                      {new Date(project.startDate).toLocaleDateString()}
                    </div>
                  )}
                  {project.crew && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users size={12} />
                      {project.crew.name}
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {TYPE_LABELS[project.projectType] ?? project.projectType}
                  </span>
                  {project.projectManager && (
                    <span className="text-[10px] text-muted-foreground">PM: {project.projectManager.firstName} {project.projectManager.lastName}</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
