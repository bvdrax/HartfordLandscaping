import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MapPin, Calendar, Clock, Users, Pencil, ChevronLeft, FileText, Receipt, Camera } from 'lucide-react'
import InvoiceStatusBadge from '@/components/invoices/InvoiceStatusBadge'
import StatusBadge from '@/components/projects/StatusBadge'
import PhotoGallery from '@/components/projects/PhotoGallery'
import QuoteStatusBadge from '@/components/quotes/QuoteStatusBadge'
import CreateQuoteButton from '@/components/quotes/CreateQuoteButton'
import SendPortalButton from '@/components/projects/SendPortalButton'
import SmsButtons from '@/components/projects/SmsButtons'
import AssignCrewForm from '@/components/workers/AssignCrewForm'

interface SiteAddress { street?: string; city?: string; state?: string; zip?: string }

const TYPE_LABELS: Record<string, string> = {
  RESIDENTIAL: 'Residential', COMMERCIAL: 'Commercial', HOA: 'HOA', BUILDER: 'Builder',
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      customers: true,
      crew: { select: { id: true, name: true } },
      projectManager: { select: { id: true, firstName: true, lastName: true } },
      tasks: { orderBy: { createdAt: 'asc' }, take: 10 },
      photos: {
        include: { uploadedBy: { select: { firstName: true, lastName: true } } },
        orderBy: { uploadedAt: 'desc' },
      },
      quotes: {
        orderBy: { versionNumber: 'desc' },
        include: { lineItems: { select: { quantity: true, laborHoursPerUnit: true } } },
      },
      invoices: { orderBy: { createdAt: 'desc' } },
      timeLogs: { select: { totalMinutes: true, clockOutAt: true } },
      _count: { select: { photos: true, quotes: true, invoices: true } },
    },
  })

  const activeCrews = project ? await prisma.crew.findMany({
    where: { isActive: true },
    select: { id: true, name: true, members: { select: { user: { select: { firstName: true, phone: true } } } } },
    orderBy: { name: 'asc' },
  }) : []

  if (!project) notFound()

  const roleStr = session.role as string
  if (roleStr === 'FIELD_WORKER' || roleStr === 'SUBCONTRACTOR') {
    const worker = await prisma.workerProfile.findUnique({ where: { userId: session.userId } })
    if (project.crewId !== worker?.crewId) notFound()
  }

  const addr = (project.siteAddress ?? {}) as SiteAddress
  const canEdit = ['OWNER', 'PROJECT_MANAGER', 'PLATFORM_ADMIN'].includes(roleStr)
  const canSeeInternal = ['OWNER', 'PLATFORM_ADMIN'].includes(roleStr)
  const canDelete = ['OWNER', 'PLATFORM_ADMIN'].includes(roleStr)

  // Estimated hours from approved quote line items
  const approvedQuote = project.quotes.find((q) => q.status === 'APPROVED')
  const estimatedHoursFromQuote = approvedQuote
    ? approvedQuote.lineItems.reduce(
        (sum, li) => sum + Number(li.quantity) * Number(li.laborHoursPerUnit),
        0
      )
    : null

  // Actual hours from completed time logs
  const actualMinutes = project.timeLogs
    .filter((tl) => tl.clockOutAt)
    .reduce((sum, tl) => sum + (tl.totalMinutes ?? 0), 0)
  const actualHours = actualMinutes / 60

  // Serialize photos for client component
  const photos = project.photos.map((p) => ({
    id: p.id,
    storageUrl: p.storageUrl,
    thumbnailUrl: p.thumbnailUrl,
    category: p.category as string,
    caption: p.caption,
    areaTag: p.areaTag,
    uploadedAt: p.uploadedAt.toISOString(),
    uploadedBy: p.uploadedBy,
  }))

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <Link href="/projects" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit">
          <ChevronLeft size={16} />
          Projects
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">{TYPE_LABELS[project.projectType] ?? project.projectType}</p>
          </div>
          {canEdit && (
            <Link href={`/projects/${project.id}/edit`} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <Pencil size={14} />
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <MapPin size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Site Address</span>
          </div>
          {addr.street ? (
            <div className="text-sm text-foreground leading-relaxed">
              <p>{addr.street}</p>
              <p>{[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}</p>
            </div>
          ) : <p className="text-sm text-muted-foreground">Not set</p>}
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Calendar size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Timeline</span>
          </div>
          <div className="text-sm text-foreground space-y-1">
            <p>Start: {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'TBD'}</p>
            <p>End: {project.estimatedEndDate ? new Date(project.estimatedEndDate).toLocaleDateString() : 'TBD'}</p>
          </div>
          {(estimatedHoursFromQuote !== null || project.estimatedHours || actualHours > 0) && (
            <div className="mt-2 space-y-0.5">
              {(estimatedHoursFromQuote !== null || project.estimatedHours) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock size={12} />
                  {estimatedHoursFromQuote !== null
                    ? `${estimatedHoursFromQuote.toFixed(1)}h est. (quote)`
                    : `${Number(project.estimatedHours)}h estimated`}
                </div>
              )}
              {actualHours > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock size={12} />
                  {actualHours.toFixed(1)}h actual
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Users size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Team</span>
          </div>
          <div className="text-sm text-foreground space-y-1">
            <p>PM: {project.projectManager ? `${project.projectManager.firstName} ${project.projectManager.lastName}` : 'Unassigned'}</p>
            <p>Crew: {project.crew?.name ?? 'Unassigned'}</p>
          </div>
        </div>
      </div>

      {canEdit && activeCrews.length > 0 && (
        <section className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Assign Crew</h2>
          <AssignCrewForm
            projectId={project.id}
            crews={activeCrews}
            currentCrewId={project.crewId ?? null}
          />
        </section>
      )}

      {project.customers.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3">Customers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {project.customers.map((c) => (
              <div key={c.id} className="bg-card border border-border rounded-lg p-4">
                <p className="font-medium text-sm text-foreground">
                  {c.firstName} {c.lastName}
                  {c.isPrimary && <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Primary</span>}
                </p>
                {c.email && <p className="text-xs text-muted-foreground mt-1">{c.email}</p>}
                {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Customer Communications — portal link + SMS buttons */}
      {canEdit && project.customers.some((c) => c.isPrimary) && (
        <section className="bg-card border border-border rounded-lg p-4 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Customer Communication</h2>
          {project.customers.find((c) => c.isPrimary)?.email && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Send the primary customer a link to view the project portal, approve quotes, and see invoices.</p>
              </div>
              <SendPortalButton projectId={project.id} />
            </div>
          )}
          {project.customers.find((c) => c.isPrimary)?.phone && (() => {
            const primaryPhone = project.customers.find((c) => c.isPrimary)!.phone!
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
            return (
              <SmsButtons phone={primaryPhone} projectName={project.name} portalUrl={baseUrl ? `${baseUrl}/portal/...` : undefined} />
            )
          })()}
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Quotes ({project._count.quotes})</h2>
          {canEdit && <CreateQuoteButton projectId={project.id} />}
        </div>
        {project.quotes.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <FileText size={24} className="mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No quotes yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {project.quotes.map((q) => (
              <Link key={q.id} href={`/quotes/${q.id}`} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">v{q.versionNumber}</span>
                  <QuoteStatusBadge status={q.status} />
                </div>
                <span className="text-sm font-semibold text-foreground">${Number(q.total).toFixed(2)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Invoices ({project._count.invoices})</h2>
          {canEdit && (
            <Link href={'/invoices/new?projectId=' + project.id} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Receipt size={13} />New Invoice
            </Link>
          )}
        </div>
        {project.invoices.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {project.invoices.map((inv) => (
              <Link key={inv.id} href={'/invoices/' + inv.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">{inv.invoiceNumber}</span>
                  <InvoiceStatusBadge status={inv.status as string} />
                  <span className="text-xs text-muted-foreground capitalize">{(inv.type as string).toLowerCase()}</span>
                </div>
                <span className="text-sm font-semibold text-foreground">${Number(inv.total).toFixed(2)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {canEdit && (
        <div className="flex items-center justify-between">
          <Link href={'/receipts/new?projectId=' + project.id} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Camera size={13} />Add Receipt
          </Link>
          <Link href={'/receipts?projectId=' + project.id} className="text-xs text-muted-foreground hover:text-foreground">
            View receipts
          </Link>
        </div>
      )}

      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">Photos</h2>
        <PhotoGallery projectId={project.id} initialPhotos={photos} canDelete={canDelete} />
      </section>

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>{project._count.photos} photos</span>
        <span>{project._count.quotes} quotes</span>
        <span>{project._count.invoices} invoices</span>
        <span>{project.tasks.length} tasks</span>
      </div>

      {project.notes && (
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Notes</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-card border border-border rounded-lg p-4">{project.notes}</p>
        </section>
      )}

      {canSeeInternal && project.internalNotes && (
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Internal Notes</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-card border border-border rounded-lg p-4">{project.internalNotes}</p>
        </section>
      )}
    </div>
  )
}
