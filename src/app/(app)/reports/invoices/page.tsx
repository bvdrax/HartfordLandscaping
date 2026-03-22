import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ChevronLeft, Download, Receipt } from 'lucide-react'
import InvoiceStatusBadge from '@/components/invoices/InvoiceStatusBadge'

export default async function InvoicesReportPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!['OWNER', 'PLATFORM_ADMIN', 'ACCOUNTANT'].includes(session.role as string)) redirect('/dashboard')

  const from = searchParams.from
  const to = searchParams.to

  const where: Record<string, unknown> = {}
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
    }
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const totals = invoices.reduce((s, inv) => ({
    total: s.total + Number(inv.total),
    paid: s.paid + Number(inv.amountPaid),
    balance: s.balance + (Number(inv.total) - Number(inv.amountPaid)),
  }), { total: 0, paid: 0, balance: 0 })

  const exportParams = new URLSearchParams({ type: 'invoices', ...(from ? { from } : {}), ...(to ? { to } : {}) })

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <Link href="/reports" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit">
          <ChevronLeft size={16} />Reports
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Receipt size={20} className="text-muted-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          </div>
          <a href={`/api/reports/export?${exportParams}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Download size={14} />CSV
          </a>
        </div>
      </div>

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
        {(from || to) && <Link href="/reports/invoices" className="text-sm text-muted-foreground hover:text-foreground">Clear</Link>}
      </form>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Invoiced</p>
          <p className="text-xl font-bold text-foreground">${totals.total.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Collected</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">${totals.paid.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Outstanding</p>
          <p className="text-xl font-bold text-foreground">${totals.balance.toFixed(2)}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['Invoice #', 'Project', 'Type', 'Status', 'Total', 'Paid', 'Balance', 'Due', 'Sent'].map((h) => (
                <th key={h} className={`py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide ${['Invoice #', 'Project', 'Type', 'Status'].includes(h) ? 'text-left' : 'text-right'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const balance = Number(inv.total) - Number(inv.amountPaid)
              return (
                <tr key={inv.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3">
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-foreground hover:text-primary">{inv.invoiceNumber}</Link>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">
                    <Link href={`/projects/${inv.project.id}`} className="hover:text-foreground">{inv.project.name}</Link>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground capitalize">{(inv.type as string).toLowerCase()}</td>
                  <td className="py-2.5 px-3"><InvoiceStatusBadge status={inv.status as string} /></td>
                  <td className="py-2.5 px-3 text-right tabular-nums">${Number(inv.total).toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-green-600 dark:text-green-400">{Number(inv.amountPaid) > 0 ? '$' + Number(inv.amountPaid).toFixed(2) : '-'}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{balance > 0.005 ? '$' + balance.toFixed(2) : '-'}</td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}</td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground">{inv.sentAt ? new Date(inv.sentAt).toLocaleDateString() : '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
