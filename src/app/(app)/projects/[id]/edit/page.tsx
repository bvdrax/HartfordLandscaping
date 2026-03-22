import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import ProjectForm from '@/components/projects/ProjectForm'

const MANAGEMENT_ROLES: Role[] = [Role.OWNER, Role.PROJECT_MANAGER, Role.PLATFORM_ADMIN]

export default async function EditProjectPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!MANAGEMENT_ROLES.includes(session.role as Role)) redirect(`/projects/${params.id}`)

  const [project, crews, managers] = await Promise.all([
    prisma.project.findUnique({ where: { id: params.id } }),
    prisma.crew.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({
      where: { isActive: true, role: { in: MANAGEMENT_ROLES } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: 'asc' },
    }),
  ])

  if (!project) notFound()

  const canEditInternalNotes = ([Role.OWNER, Role.PLATFORM_ADMIN] as Role[]).includes(session.role as Role)

  const projectData = {
    ...project,
    startDate: project.startDate?.toISOString() ?? null,
    estimatedEndDate: project.estimatedEndDate?.toISOString() ?? null,
    estimatedHours: project.estimatedHours ? Number(project.estimatedHours) : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    siteAddress: (project.siteAddress ?? undefined) as any,
  }

  return (
    <div className="p-6 max-w-3xl">
      <Link href={`/projects/${project.id}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 w-fit">
        <ChevronLeft size={16} />
        Back to project
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Edit Project</h1>
        <p className="text-sm text-muted-foreground mt-0.5 truncate">{project.name}</p>
      </div>
      <ProjectForm project={projectData} crews={crews} managers={managers} canEditInternalNotes={canEditInternalNotes} />
    </div>
  )
}
