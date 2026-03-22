import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import InvoiceForm from '@/components/invoices/InvoiceForm'

export default async function NewInvoicePage({ searchParams }: { searchParams: { projectId?: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const canCreate = ['OWNER', 'PROJECT_MANAGER', 'PLATFORM_ADMIN'].includes(session.role as string)
  if (!canCreate) redirect('/invoices')

  const projects = await prisma.project.findMany({
    where: { status: { notIn: ['ARCHIVED', 'PAID'] } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const defaultProjectId = searchParams.projectId ?? undefined

  // Load quotes for the default project if provided
  const quotes = defaultProjectId
    ? await prisma.quote.findMany({
        where: { projectId: defaultProjectId, status: { in: ['APPROVED', 'SENT'] } },
        select: { id: true, versionNumber: true, total: true },
        orderBy: { versionNumber: 'desc' },
      })
    : []

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">New Invoice</h1>
        <p className="text-sm text-muted-foreground mt-1">Create an invoice for a project.</p>
      </div>
      <InvoiceForm
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        defaultProjectId={defaultProjectId}
        quotes={quotes.map((q) => ({ id: q.id, versionNumber: q.versionNumber, total: Number(q.total) }))}
      />
    </div>
  )
}
