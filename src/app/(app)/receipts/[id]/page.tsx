import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ChevronLeft, ExternalLink, Pencil } from 'lucide-react'
import ReceiptStatusBadge from '@/components/receipts/ReceiptStatusBadge'
import ReceiptActions from '@/components/receipts/ReceiptActions'

function fmt(n: number | null | undefined) {
  if (n == null) return '-'
  return '$' + Number(n).toFixed(2)
}

function ExpenseBadge({ type }: { type: string }) {
  const isPersonal = type === 'PERSONAL'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      isPersonal ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
    }`}>
      {isPersonal ? 'Personal' : 'Business'}
    </span>
  )
}

export default async function ReceiptDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const receipt = await (prisma.receipt.findUnique as any)({
    where: { id: params.id },
    include: {
      project: { select: { id: true, name: true } },
      uploadedBy: { select: { firstName: true, lastName: true } },
      purchasedBy: { select: { firstName: true, lastName: true } },
      reviewedBy: { select: { firstName: true, lastName: true } },
      lineItems: { include: { project: { select: { id: true, name: true } } } },
    },
  })
  if (!receipt) notFound()

  const role = session.role as string
  if (role === 'FIELD_WORKER' && receipt.uploadedByUserId !== session.userId) notFound()

  const canApprove = ['OWNER', 'ACCOUNTANT', 'PLATFORM_ADMIN'].includes(role)
  const canEdit = ['OWNER', 'ACCOUNTANT', 'PLATFORM_ADMIN'].includes(role)

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <Link href="/receipts" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit">
          <ChevronLeft size={16} />Receipts
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{receipt.vendor ?? 'Receipt'}</h1>
              <ReceiptStatusBadge status={receipt.status} />
              <ExpenseBadge type={receipt.expenseType ?? 'BUSINESS'} />
            </div>
            <Link href={`/projects/${receipt.project.id}`} className="text-sm text-muted-foreground hover:text-foreground mt-0.5 block">
              {receipt.project.name}
            </Link>
          </div>
          {canEdit && (
            <Link href={`/receipts/${receipt.id}/edit`}
              className="flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <Pencil size={14} />Edit
            </Link>
          )}
        </div>
      </div>

      {receipt.storageUrl && (
        <div className="relative">
          <img src={receipt.storageUrl} alt="Receipt" className="w-full max-h-72 object-contain rounded-lg border border-border bg-muted/30" />
          <a href={receipt.storageUrl} target="_blank" rel="noopener noreferrer"
            className="absolute top-2 right-2 p-1.5 bg-background/80 rounded text-muted-foreground hover:text-foreground">
            <ExternalLink size={14} />
          </a>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Date</span>
          <span>{receipt.receiptDate ? new Date(receipt.receiptDate).toLocaleDateString() : '-'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total</span>
          <span className="font-semibold">{fmt(receipt.totalAmount ? Number(receipt.totalAmount) : null)}</span>
        </div>
        {receipt.taxAmount && Number(receipt.taxAmount) > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>{fmt(Number(receipt.taxAmount))}</span>
          </div>
        )}
        {receipt.deliveryFee && Number(receipt.deliveryFee) > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery</span>
            <span>{fmt(Number(receipt.deliveryFee))}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-2 mt-1">
          <span className="text-muted-foreground">Entered by</span>
          <span>{receipt.uploadedBy.firstName} {receipt.uploadedBy.lastName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Purchased by</span>
          <span>
            {receipt.purchasedBy
              ? `${receipt.purchasedBy.firstName} ${receipt.purchasedBy.lastName}`
              : receipt.uploadedBy.firstName + ' ' + receipt.uploadedBy.lastName}
          </span>
        </div>
        {receipt.reviewedBy && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reviewed by</span>
            <span>{receipt.reviewedBy.firstName} {receipt.reviewedBy.lastName}</span>
          </div>
        )}
        {receipt.notes && (
          <div className="border-t border-border pt-2 mt-1">
            <p className="text-muted-foreground mb-1">Notes</p>
            <p className="whitespace-pre-wrap">{receipt.notes}</p>
          </div>
        )}
      </div>

      {receipt.lineItems.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3">Line Items</h2>
          <div className="space-y-2">
            {receipt.lineItems.map((li: {
              id: string
              description: string
              quantity: number
              unitCost: number
              extendedCost: number
              amortizedTax: number
              amortizedDelivery: number
              totalCost: number
              expenseType: string | null
              project: { id: string; name: string } | null
            }) => {
              const effectiveExpense = li.expenseType ?? receipt.expenseType ?? 'BUSINESS'
              const effectiveProject = li.project ?? receipt.project
              return (
                <div key={li.id} className="bg-card border border-border rounded-lg px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{li.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {Number(li.quantity)} x {fmt(Number(li.unitCost))} = {fmt(Number(li.extendedCost))}
                        {(Number(li.amortizedTax) > 0 || Number(li.amortizedDelivery) > 0) && (
                          <span> + {fmt(Number(li.amortizedTax) + Number(li.amortizedDelivery))} tax/del</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Link href={`/projects/${effectiveProject.id}`} className="text-xs text-primary hover:underline">
                          {effectiveProject.name}
                        </Link>
                        <ExpenseBadge type={effectiveExpense} />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-foreground shrink-0">{fmt(Number(li.totalCost))}</span>
                  </div>
                </div>
              )
            })}
            <div className="flex justify-between text-sm font-semibold text-foreground px-4 py-2 bg-muted/30 rounded-lg">
              <span>Total</span>
              <span>{fmt(receipt.lineItems.reduce((s: number, li: { totalCost: number }) => s + Number(li.totalCost), 0))}</span>
            </div>
          </div>
        </section>
      )}

      {canApprove && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Approval</p>
          <ReceiptActions receiptId={receipt.id} status={receipt.status} canApprove={canApprove} />
          {(receipt.status === 'APPROVED' || receipt.status === 'REJECTED') && (
            <p className="text-sm text-muted-foreground">
              Status: <span className="font-medium text-foreground capitalize">{receipt.status.toLowerCase()}</span>
              {receipt.reviewedAt && ` on ${new Date(receipt.reviewedAt).toLocaleDateString()}`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
