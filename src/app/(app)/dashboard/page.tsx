import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { BarChart2 } from 'lucide-react'
import SummaryCards from '@/components/dashboard/SummaryCards'
import ProjectPipeline from '@/components/dashboard/ProjectPipeline'
import UpcomingCalendar from '@/components/dashboard/UpcomingCalendar'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const role = session.role as string
  const canSeeFinancials = ['OWNER', 'PLATFORM_ADMIN', 'ACCOUNTANT'].includes(role)
  const isWorker = ['FIELD_WORKER', 'SUBCONTRACTOR'].includes(role)

  // Summary data
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const [
    activeProjectsCount,
    openQuotesCount,
    unpaidInvoices,
    weekTimeLogs,
    allProjects,
    crewAssignments,
  ] = await Promise.all([
    prisma.project.count({
      where: { status: { in: ['SCHEDULED', 'IN_PROGRESS', 'PUNCH_LIST'] } },
    }),
    prisma.quote.count({
      where: { status: { in: ['DRAFT', 'SENT'] } },
    }),
    canSeeFinancials ? prisma.invoice.findMany({
      where: { status: { in: ['SENT', 'PARTIAL'] } },
      select: { total: true, amountPaid: true },
    }) : Promise.resolve([]),
    prisma.timeLog.findMany({
      where: { clockInAt: { gte: weekStart }, clockOutAt: { not: null } },
      select: { totalMinutes: true },
    }),
    isWorker ? Promise.resolve([]) : prisma.project.findMany({
      where: { status: { notIn: ['ARCHIVED'] } },
      include: {
        customers: { where: { isPrimary: true }, take: 1, select: { firstName: true, lastName: true } },
        quotes: { where: { status: 'APPROVED' }, select: { total: true }, orderBy: { versionNumber: 'desc' }, take: 1 },
        invoices: { select: { total: true, amountPaid: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.crewProjectAssignment.findMany({
      where: {
        endDate: { gte: new Date() },
      },
      include: {
        crew: { select: { name: true } },
        project: { select: { id: true, name: true } },
      },
    }),
  ])

  const weekHours = weekTimeLogs.reduce((s: number, l: { totalMinutes: number | null }) => s + (l.totalMinutes ?? 0), 0) / 60
  const unpaidCount = unpaidInvoices.length
  const unpaidAmount = unpaidInvoices.reduce((s: number, inv: { total: unknown; amountPaid: unknown }) => s + Number(inv.total) - Number(inv.amountPaid), 0)

  type ProjectRow = {
    id: string; name: string; status: string; projectType: string | null; startDate: Date | null
    customers: { firstName: string; lastName: string }[]
    quotes: { total: unknown }[]
    invoices: { total: unknown; amountPaid: unknown }[]
  }
  const serializedProjects = (allProjects as ProjectRow[]).map((p) => {
    const primaryCustomer = p.customers[0]
    const approvedQuote = p.quotes[0]
    const balance = p.invoices.reduce((s: number, inv) => s + (Number(inv.total) - Number(inv.amountPaid)), 0)
    return {
      id: p.id,
      name: p.name,
      status: p.status as string,
      projectType: p.projectType as string,
      customerName: primaryCustomer ? `${primaryCustomer.firstName} ${primaryCustomer.lastName}` : '',
      quoteTotal: approvedQuote ? Number(approvedQuote.total) : 0,
      balance,
      startDate: p.startDate?.toISOString() ?? null,
    }
  })

  type AssignmentRow = { crew: { name: string }; project: { id: string; name: string }; startDate: Date; endDate: Date | null }
  const serializedAssignments = (crewAssignments as AssignmentRow[]).map((a) => ({
    crewName: a.crew.name,
    projectId: a.project.id,
    projectName: a.project.name,
    startDate: a.startDate.toISOString(),
    endDate: a.endDate?.toISOString() ?? null,
  }))

  return (
    <div className="p-6 space-y-8 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        {canSeeFinancials && (
          <Link href="/reports"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <BarChart2 size={16} />Reports
          </Link>
        )}
      </div>

      <SummaryCards
        activeProjects={activeProjectsCount}
        openQuotes={openQuotesCount}
        unpaidInvoices={unpaidCount}
        unpaidAmount={unpaidAmount}
        weekHours={weekHours}
      />

      {!isWorker && <ProjectPipeline projects={serializedProjects} />}

      <UpcomingCalendar assignments={serializedAssignments} />
    </div>
  )
}
