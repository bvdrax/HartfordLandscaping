import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Camera, Plus } from 'lucide-react'
import ReceiptStatusBadge from '@/components/receipts/ReceiptStatusBadge'

function fmt(n: number | null) {
  if (n === null) return '-'
  return '$' + Number(n).toFixed(2)
}

export default async function ReceiptsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const role = session.role as string
  const isFieldWorker = role === 'FIELD_WORKER'
  const canAdd = ['OWNER', 'PLATFORM_ADMIN', 'ACCOUNTANT', 'PROJECT_MANAGER', 'FIELD_WORKER'].includes(role)

  const where = isFieldWorker ? { uploadedByUserId: session.userId } : {}

  const receipts = await prisma.receipt.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
      uploadedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  // Summary
  const pending = receipts.filter((r) => r.status === 'PENDING').length
  const approved = receipts.filter((r) => r.status === 'APPROVED')
  const totalApproved = approved.reduce((s, r) => s + Number(r.totalAmount ?? 0), 0)

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera size={20} className="text-muted-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Receipts</h1>
        </div>
        {canAdd && (
          <Link href="/receipts/new"
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={16} />New Receipt
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending Review</p>
          <p className="text-2xl font-bold text-foreground">{pending}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Approved Spend</p>
          <p className="text-2xl font-bold text-foreground">{fmt(totalApproved)}</p>
        </div>
      </div>

      {receipts.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <Camera size={32} className="mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No receipts yet.</p>
          {canAdd && (
            <Link href="/receipts/new" className="mt-3 inline-block text-sm text-primary hover:underline">
              Add your first receipt
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {receipts.map((r) => (
            <Link key={r.id} href={`/receipts/${r.id}`}
              className="flex items-start justify-between bg-card border border-border rounded-lg px-4 py-3 hover:border-primary/50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{r.vendor ?? 'Unknown vendor'}</span>
                  <ReceiptStatusBadge status={r.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{r.project.name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.receiptDate ? new Date(r.receiptDate).toLocaleDateString() : 'No date'}
                  {!isFieldWorker && ` - ${r.uploadedBy.firstName} ${r.uploadedBy.lastName}`}
                </p>
              </div>
              <span className="text-sm font-semibold text-foreground shrink-0 ml-3">{fmt(r.totalAmount ? Number(r.totalAmount) : null)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
