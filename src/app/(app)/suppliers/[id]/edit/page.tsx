import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ChevronLeft } from 'lucide-react'
import SupplierForm from '@/components/suppliers/SupplierForm'

export default async function EditSupplierPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const roleStr = session.role as string
  if (!['OWNER', 'PROJECT_MANAGER', 'PLATFORM_ADMIN', 'ACCOUNTANT'].includes(roleStr)) redirect(`/suppliers/${params.id}`)

  const supplier = await prisma.supplier.findUnique({ where: { id: params.id } })
  if (!supplier) notFound()

  const supplierData = {
    id: supplier.id,
    name: supplier.name,
    accountNumber: supplier.accountNumber,
    repName: supplier.repName,
    repPhone: supplier.repPhone,
    repEmail: supplier.repEmail,
    notes: supplier.notes,
  }

  return (
    <div className="p-6 max-w-2xl">
      <Link href={`/suppliers/${supplier.id}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 w-fit">
        <ChevronLeft size={16} />Back to supplier
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Edit Supplier</h1>
        <p className="text-sm text-muted-foreground mt-0.5 truncate">{supplier.name}</p>
      </div>
      <SupplierForm supplier={supplierData} />
    </div>
  )
}
