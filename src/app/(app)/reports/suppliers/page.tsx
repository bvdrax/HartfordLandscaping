import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ChevronLeft, Download, Package } from 'lucide-react'

export default async function SupplierSpendPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!['OWNER', 'PLATFORM_ADMIN', 'ACCOUNTANT'].includes(session.role as string)) redirect('/dashboard')

  const from = searchParams.from
  const to = searchParams.to

  const where: Record<string, unknown> = { status: 'APPROVED' }
  if (from || to) {
    where.receiptDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
    }
  }

  const receipts = await prisma.receipt.findMany({
    where,
    include: { project: { select: { id: true, name: true } } },
    orderBy: { receiptDate: 'desc' },
  })

  // Group by vendor
  const byVendor: Record<string, { count: number; total: number; projects: Set<string> }> = {}
  for (const r of receipts) {
    const v = r.vendor ?? 'Unknown'
    if (!byVendor[v]) byVendor[v] = { count: 0, total: 0, projects: new Set() }
    byVendor[v].count++
    byVendor[v].total += Number(r.totalAmount ?? 0)
    byVendor[v].projects.add(r.project.name)
  }

  const grandTotal = receipts.reduce((s, r) => s + Number(r.totalAmount ?? 0), 0)
  const exportParams = new URLSearchParams({ type: 'suppliers', ...(from ? { from } : {}), ...(to ? { to } : {}) })

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <Link href="/reports" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit">
          <ChevronLeft size={16} />Reports
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Package size={20} className="text-muted-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Supplier Spend</h1>
          </div>
          <a href={`/api/reports/export?${exportParams}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Download size={14} />CSV
          </a>
        </div>
      </div>

      <form className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">From</label>
          <input type="date" name="from" defaultValue={from}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">To</label>
          <input type="date" name="to" defaultValue={to}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <button type="submit" className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Filter
        </button>
        {(from || to) && <Link href="/reports/suppliers" className="text-sm text-muted-foreground hover:text-foreground">Clear</Link>}
      </form>

      <div className="bg-card border border-border rounded-lg p-4 flex gap-6">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Spend</p>
          <p className="text-2xl font-bold text-foreground">${grandTotal.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Vendors</p>
          <p className="text-2xl font-bold text-foreground">{Object.keys(byVendor).length}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Receipts</p>
          <p className="text-2xl font-bold text-foreground">{receipts.length}</p>
        </div>
      </div>

      {Object.keys(byVendor).length === 0 ? (
        <p className="text-sm text-muted-foreground">No approved receipts for this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Vendor</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Receipts</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">% of Spend</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byVendor)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([vendor, data]) => (
                  <tr key={vendor} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground">{vendor}</td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">{data.count}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-medium">${data.total.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">
                      {grandTotal > 0 ? (data.total / grandTotal * 100).toFixed(1) + '%' : '-'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
