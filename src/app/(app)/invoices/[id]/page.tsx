import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ChevronLeft, Pencil } from 'lucide-react'
import InvoiceStatusBadge from '@/components/invoices/InvoiceStatusBadge'
import InvoiceActions from '@/components/invoices/InvoiceActions'

function fmt(n: number) { return '$' + Number(n).toFixed(2) }

const TYPE_LABELS: Record<string, string> = {
  DEPOSIT: 'Deposit', MILESTONE: 'Milestone', FINAL: 'Final', RECURRING: 'Recurring',
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash', CHECK: 'Check', CARD_STRIPE: 'Card (Stripe)', ACH: 'ACH',
  ZELLE: 'Zelle', VENMO: 'Venmo', OTHER: 'Other',
}

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      project: { select: { id: true, name: true } },
      quote: { select: { id: true, versionNumber: true } },
      payments: { orderBy: { paidAt: 'desc' } },
    },
  })
  if (!invoice) notFound()

  const role = session.role as string
  const canEdit = ['OWNER', 'PROJECT_MANAGER', 'PLATFORM_ADMIN'].includes(role)
  const canVoid = ['OWNER', 'PLATFORM_ADMIN'].includes(role)
  const balance = Number(invoice.total) - Number(invoice.amountPaid)

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <Link href="/invoices" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit">
          <ChevronLeft size={16} />Invoices
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{invoice.invoiceNumber}</h1>
              <InvoiceStatusBadge status={invoice.status as string} />
              <span className="text-sm text-muted-foreground">{TYPE_LABELS[invoice.type as string] ?? invoice.type}</span>
            </div>
            <Link href={'/projects/' + invoice.project.id} className="text-sm text-muted-foreground hover:text-foreground mt-0.5 block">
              {invoice.project.name}
            </Link>
          </div>
          {canEdit && invoice.status !== 'VOID' && invoice.status !== 'PAID' && (
            <Link href={'/invoices/' + invoice.id + '/edit'} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm font-medium text-muted-foreground hover:text-foreground shrink-0">
              <Pencil size={14} />Edit
            </Link>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-foreground">{fmt(Number(invoice.amountDue))}</span>
        </div>
        {Number(invoice.taxAmount) > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax ({(Number(invoice.taxRate) * 100).toFixed(2)}%)</span>
            <span className="text-foreground">{fmt(Number(invoice.taxAmount))}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-foreground border-t border-border pt-2 mt-1">
          <span>Total</span>
          <span>{fmt(Number(invoice.total))}</span>
        </div>
        {Number(invoice.amountPaid) > 0 && (
          <>
            <div className="flex justify-between text-green-700 dark:text-green-400">
              <span>Paid</span>
              <span>-{fmt(Number(invoice.amountPaid))}</span>
            </div>
            <div className="flex justify-between font-semibold text-foreground border-t border-border pt-2 mt-1">
              <span>Balance Due</span>
              <span>{fmt(balance)}</span>
            </div>
          </>
        )}
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        {invoice.dueDate && (
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-0.5">Due Date</p>
            <p className="font-medium text-foreground">{new Date(invoice.dueDate).toLocaleDateString()}</p>
          </div>
        )}
        {invoice.sentAt && (
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-0.5">Sent</p>
            <p className="font-medium text-foreground">{new Date(invoice.sentAt).toLocaleDateString()}</p>
          </div>
        )}
        {invoice.paidAt && (
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-0.5">Paid</p>
            <p className="font-medium text-foreground">{new Date(invoice.paidAt).toLocaleDateString()}</p>
          </div>
        )}
        {invoice.quote && (
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-0.5">Quote</p>
            <Link href={'/quotes/' + invoice.quote.id} className="font-medium text-primary hover:underline">
              v{invoice.quote.versionNumber}
            </Link>
          </div>
        )}
      </div>

      {invoice.notes && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-card border border-border rounded-lg p-3">{invoice.notes}</p>
        </div>
      )}

      {/* Actions */}
      {canEdit && (
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm font-semibold text-foreground mb-3">Actions</p>
          <InvoiceActions
            invoiceId={invoice.id}
            status={invoice.status as string}
            total={Number(invoice.total)}
            amountPaid={Number(invoice.amountPaid)}
            stripePaymentIntentId={invoice.stripePaymentIntentId}
            canEdit={canEdit}
            canVoid={canVoid}
          />
        </div>
      )}

      {/* Payments */}
      {invoice.payments.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3">Payment History</h2>
          <div className="space-y-2">
            {invoice.payments.map((p) => (
              <div key={p.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-foreground">{METHOD_LABELS[p.paymentMethod as string] ?? p.paymentMethod}</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.paidAt).toLocaleDateString()}{p.referenceNumber ? ' - ' + p.referenceNumber : ''}</p>
                  {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                </div>
                <span className="font-semibold text-green-700 dark:text-green-400">{fmt(Number(p.amount))}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
