import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import ReceiptStatusBadge from '@/components/receipts/ReceiptStatusBadge'
import ReceiptActions from '@/components/receipts/ReceiptActions'

function fmt(n: number | null | undefined) {
  if (n == null) return '-'
  return '$' + Number(n).toFixed(2)
}

export default async function ReceiptDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const receipt = await prisma.receipt.findUnique({
    where: { id: params.id },
    include: {
      project: { select: { id: true, name: true } },
      uploadedBy: { select: { firstName: true, lastName: true } },
      reviewedBy: { select: { firstName: true, lastName: true } },
      lineItems: true,
    },
  })
  if (!receipt) notFound()

  const role = session.role as string
  if (role === 'FIELD_WORKER' && receipt.uploadedByUserId !== session.userId) notFound()

  const canApprove = ['OWNER', 'ACCOUNTANT', 'PLATFORM_ADMIN'].includes(role)

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
            </div>
            <Link href={`/projects/${receipt.project.id}`} className="text-sm text-muted-foreground hover:text-foreground mt-0.5 block">
              {receipt.project.name}
            </Link>
          </div>
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
          <span className="text-muted-foreground">Uploaded by</span>
          <span>{receipt.uploadedBy.firstName} {receipt.uploadedBy.lastName}</span>
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
            {receipt.lineItems.map((li) => (
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
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0">{fmt(Number(li.totalCost))}</span>
                </div>
              </div>
            ))}
            <div className="flex justify-between text-sm font-semibold text-foreground px-4 py-2 bg-muted/30 rounded-lg">
              <span>Total</span>
              <span>{fmt(receipt.lineItems.reduce((s, li) => s + Number(li.totalCost), 0))}</span>
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
