import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Plus, FileText } from 'lucide-react'
import InvoiceStatusBadge from '@/components/invoices/InvoiceStatusBadge'

function fmt(n: number) { return '$' + Number(n).toFixed(2) }

export default async function InvoicesPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const invoices = await prisma.invoice.findMany({
    include: { project: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const canCreate = ['OWNER', 'PROJECT_MANAGER', 'PLATFORM_ADMIN'].includes(session.role as string)

  const totalOutstanding = invoices
    .filter((inv) => inv.status === 'SENT' || inv.status === 'PARTIAL')
    .reduce((sum, inv) => sum + Number(inv.total) - Number(inv.amountPaid), 0)

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          {totalOutstanding > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">{fmt(totalOutstanding)} outstanding</p>
          )}
        </div>
        {canCreate && (
          <Link
            href="/invoices/new"
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-white"
            style={{ backgroundColor: '#2D6A4F' }}
          >
            <Plus size={14} />
            New Invoice
          </Link>
        )}
      </div>

      {invoices.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <FileText size={32} className="mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
          {canCreate && (
            <Link href="/invoices/new" className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
              <Plus size={14} />Create first invoice
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => {
            const balance = Number(inv.total) - Number(inv.amountPaid)
            return (
              <Link
                key={inv.id}
                href={'/invoices/' + inv.id}
                className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 hover:border-primary/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{inv.invoiceNumber}</span>
                    <InvoiceStatusBadge status={inv.status as string} />
                    <span className="text-xs text-muted-foreground capitalize">{(inv.type as string).toLowerCase()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{inv.project.name}</p>
                  {inv.dueDate && (
                    <p className="text-xs text-muted-foreground">Due {new Date(inv.dueDate).toLocaleDateString()}</p>
                  )}
                </div>
                <div className="text-right ml-4 shrink-0">
                  <p className="text-sm font-semibold text-foreground">{fmt(Number(inv.total))}</p>
                  {(inv.status === 'PARTIAL') && (
                    <p className="text-xs text-muted-foreground">{fmt(balance)} due</p>
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
