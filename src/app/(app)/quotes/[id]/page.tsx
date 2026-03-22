import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ChevronLeft } from 'lucide-react'
import QuoteStatusBadge from '@/components/quotes/QuoteStatusBadge'
import QuoteBuilder from '@/components/quotes/QuoteBuilder'

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const roleStr = session.role as string
  const canEdit = ['OWNER', 'PROJECT_MANAGER', 'PLATFORM_ADMIN'].includes(roleStr)

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: {
      project: { select: { id: true, name: true, globalMarginOverride: true } },
      lineItems: {
        include: { sku: { select: { id: true, name: true, unitOfMeasure: true } } },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })
  if (!quote) notFound()

  // Load available SKUs for the line item picker
  const skus = await prisma.sku.findMany({
    where: { isActive: true },
    select: { id: true, name: true, unitOfMeasure: true, basePrice: true },
    orderBy: { name: 'asc' },
  })

  const quoteData = {
    id: quote.id,
    status: quote.status as string,
    versionNumber: quote.versionNumber,
    notes: quote.notes,
    termsAndConditions: quote.termsAndConditions,
    globalMarginPct: Number(quote.globalMarginPct),
    materialsTotal: Number(quote.materialsTotal),
    laborTotal: Number(quote.laborTotal),
    taxTotal: Number(quote.taxTotal),
    total: Number(quote.total),
    lineItems: quote.lineItems.map((li) => ({
      id: li.id,
      description: li.description,
      quantity: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      laborPricePerUnit: Number(li.laborPricePerUnit),
      lineTotal: Number(li.lineTotal),
      sku: li.sku,
    })),
  }

  const skusData = skus.map((s) => ({ ...s, basePrice: Number(s.basePrice) }))

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <Link href={`/projects/${quote.project.id}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit">
          <ChevronLeft size={16} />{quote.project.name}
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">Quote v{quote.versionNumber}</h1>
              <QuoteStatusBadge status={quote.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{quote.project.name}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">${Number(quote.total).toFixed(2)}</p>
            {quote.sentAt && <p className="text-xs text-muted-foreground">Sent {new Date(quote.sentAt).toLocaleDateString()}</p>}
            {quote.expiresAt && quote.status === 'SENT' && <p className="text-xs text-muted-foreground">Expires {new Date(quote.expiresAt).toLocaleDateString()}</p>}
          </div>
        </div>
      </div>

      <QuoteBuilder quote={quoteData} availableSkus={skusData} canEdit={canEdit} />
    </div>
  )
}
