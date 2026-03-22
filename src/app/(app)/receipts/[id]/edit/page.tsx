import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import ReceiptEditForm from '@/components/receipts/ReceiptEditForm'

export default async function EditReceiptPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const role = session.role as string
  const canEdit = ['OWNER', 'ACCOUNTANT', 'PLATFORM_ADMIN'].includes(role)
  if (!canEdit) redirect(`/receipts/${params.id}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const receipt = await (prisma.receipt.findUnique as any)({
    where: { id: params.id },
    include: {
      lineItems: { include: { project: { select: { id: true, name: true } } } },
    },
  })
  if (!receipt) notFound()

  const [projects, users] = await Promise.all([
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, firstName: true, lastName: true }, orderBy: { firstName: 'asc' } }),
  ])

  const initialData = {
    id: receipt.id,
    vendor: receipt.vendor,
    receiptDate: receipt.receiptDate ? new Date(receipt.receiptDate).toISOString().split('T')[0] : null,
    totalAmount: receipt.totalAmount ? String(Number(receipt.totalAmount)) : '',
    taxAmount: receipt.taxAmount ? String(Number(receipt.taxAmount)) : '',
    deliveryFee: receipt.deliveryFee ? String(Number(receipt.deliveryFee)) : '',
    notes: receipt.notes,
    expenseType: receipt.expenseType ?? 'BUSINESS',
    purchasedByUserId: receipt.purchasedByUserId ?? null,
    lineItems: receipt.lineItems.map((li: {
      id: string
      description: string
      quantity: number
      unitCost: number
      projectId: string | null
      expenseType: string | null
    }) => ({
      id: li.id,
      description: li.description,
      quantity: String(Number(li.quantity)),
      unitCost: String(Number(li.unitCost)),
      projectId: li.projectId ?? null,
      expenseType: li.expenseType ?? null,
    })),
  }

  return (
    <div className="p-6 space-y-6 max-w-lg">
      <div>
        <Link href={`/receipts/${params.id}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit">
          <ChevronLeft size={16} />Receipt
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Edit Receipt</h1>
        <p className="text-sm text-muted-foreground mt-1">{receipt.vendor ?? 'Receipt'}</p>
      </div>

      <ReceiptEditForm receipt={initialData} projects={projects} users={users} />
    </div>
  )
}
