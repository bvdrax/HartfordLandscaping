import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ChevronLeft, Pencil, Phone, Mail } from 'lucide-react'
import SkuManager from '@/components/suppliers/SkuManager'

export default async function SupplierDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const roleStr = session.role as string
  const canEdit = ['OWNER', 'PROJECT_MANAGER', 'PLATFORM_ADMIN', 'ACCOUNTANT'].includes(roleStr)

  const supplier = await prisma.supplier.findUnique({
    where: { id: params.id },
    include: {
      skus: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
        include: { bulkPricingTiers: { orderBy: { minQuantity: 'asc' } } },
      },
    },
  })
  if (!supplier) notFound()

  const skus = supplier.skus.map((s) => ({
    ...s,
    basePrice: Number(s.basePrice),
    globalMarginPct: s.globalMarginPct ? Number(s.globalMarginPct) : null,
    bulkPricingTiers: s.bulkPricingTiers.map((t) => ({ id: t.id, minQuantity: Number(t.minQuantity), pricePerUnit: Number(t.pricePerUnit) })),
  }))

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <Link href="/suppliers" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit">
          <ChevronLeft size={16} />Suppliers
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{supplier.name}</h1>
            {supplier.accountNumber && <p className="text-sm text-muted-foreground mt-0.5">Account: {supplier.accountNumber}</p>}
          </div>
          {canEdit && (
            <Link href={`/suppliers/${supplier.id}/edit`} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm font-medium text-muted-foreground hover:text-foreground shrink-0">
              <Pencil size={14} />Edit
            </Link>
          )}
        </div>
      </div>

      {(supplier.repName || supplier.repPhone || supplier.repEmail) && (
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Sales Rep</p>
          {supplier.repName && <p className="text-sm font-medium text-foreground">{supplier.repName}</p>}
          <div className="flex flex-wrap gap-4 mt-1">
            {supplier.repPhone && (
              <a href={`tel:${supplier.repPhone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <Phone size={12} />{supplier.repPhone}
              </a>
            )}
            {supplier.repEmail && (
              <a href={`mailto:${supplier.repEmail}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <Mail size={12} />{supplier.repEmail}
              </a>
            )}
          </div>
        </div>
      )}

      {supplier.notes && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{supplier.notes}</p>
        </div>
      )}

      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">SKUs ({skus.length})</h2>
        <SkuManager supplierId={supplier.id} initialSkus={skus} canEdit={canEdit} />
      </section>
    </div>
  )
}
