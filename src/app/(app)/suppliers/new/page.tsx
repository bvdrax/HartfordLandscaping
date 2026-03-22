import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import SupplierForm from '@/components/suppliers/SupplierForm'

export default async function NewSupplierPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const roleStr = session.role as string
  if (!['OWNER', 'PROJECT_MANAGER', 'PLATFORM_ADMIN', 'ACCOUNTANT'].includes(roleStr)) redirect('/suppliers')

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">New Supplier</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Add a materials supplier and their SKU catalog</p>
      </div>
      <SupplierForm />
    </div>
  )
}
