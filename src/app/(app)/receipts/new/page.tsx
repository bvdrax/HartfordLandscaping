import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import ReceiptForm from '@/components/receipts/ReceiptForm'

export default async function NewReceiptPage({ searchParams }: { searchParams: { projectId?: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const role = session.role as string
  const canAdd = ['OWNER', 'PLATFORM_ADMIN', 'ACCOUNTANT', 'PROJECT_MANAGER', 'FIELD_WORKER'].includes(role)
  if (!canAdd) redirect('/receipts')

  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const serialized = projects.map((p) => ({ id: p.id, name: p.name }))

  return (
    <div className="p-6 space-y-6 max-w-lg">
      <div>
        <Link href="/receipts" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit">
          <ChevronLeft size={16} />Receipts
        </Link>
        <h1 className="text-2xl font-bold text-foreground">New Receipt</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload a receipt photo and optionally use OCR to extract data.</p>
      </div>

      <ReceiptForm projects={serialized} defaultProjectId={searchParams.projectId} />
    </div>
  )
}
