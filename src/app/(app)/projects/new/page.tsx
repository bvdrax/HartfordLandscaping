import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import ProjectForm from '@/components/projects/ProjectForm'

const MANAGEMENT_ROLES: Role[] = [Role.OWNER, Role.PROJECT_MANAGER, Role.PLATFORM_ADMIN]

export default async function NewProjectPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!MANAGEMENT_ROLES.includes(session.role as Role)) redirect('/projects')

  const [crews, managers] = await Promise.all([
    prisma.crew.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({
      where: { isActive: true, role: { in: MANAGEMENT_ROLES } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: 'asc' },
    }),
  ])

  const canEditInternalNotes = ([Role.OWNER, Role.PLATFORM_ADMIN] as Role[]).includes(session.role as Role)

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">New Project</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Create a new landscaping project</p>
      </div>
      <ProjectForm crews={crews} managers={managers} canEditInternalNotes={canEditInternalNotes} />
    </div>
  )
}
