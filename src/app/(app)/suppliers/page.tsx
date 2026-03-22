import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Plus, Package } from 'lucide-react'

export default async function SuppliersPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const roleStr = session.role as string
  const canEdit = ['OWNER', 'PROJECT_MANAGER', 'PLATFORM_ADMIN', 'ACCOUNTANT'].includes(roleStr)

  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    include: { _count: { select: { skus: { where: { isActive: true } } } } },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Suppliers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{suppliers.length} active supplier{suppliers.length !== 1 ? 's' : ''}</p>
        </div>
        {canEdit && (
          <Link href="/suppliers/new" className="flex items-center gap-2 px-4 py-2 rounded-md text-white text-sm font-semibold" style={{ backgroundColor: '#2D6A4F' }}>
            <Plus size={16} />New Supplier
          </Link>
        )}
      </div>

      {suppliers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg">No suppliers yet</p>
          {canEdit && <Link href="/suppliers/new" className="mt-3 inline-block text-sm underline text-primary">Add your first supplier</Link>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <Link key={s.id} href={`/suppliers/${s.id}`} className="block bg-card border border-border rounded-lg p-4 hover:border-primary/50 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-foreground text-sm">{s.name}</h3>
                <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">{s._count.skus} SKU{s._count.skus !== 1 ? 's' : ''}</span>
              </div>
              {s.accountNumber && <p className="text-xs text-muted-foreground">Acct: {s.accountNumber}</p>}
              {s.repName && <p className="text-xs text-muted-foreground mt-1">{s.repName}{s.repPhone ? ` · ${s.repPhone}` : ''}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
