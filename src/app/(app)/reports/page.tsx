import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { BarChart2, TrendingUp, Clock, Package, Receipt, Download } from 'lucide-react'

export default async function ReportsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const role = session.role as string
  if (!['OWNER', 'PLATFORM_ADMIN', 'ACCOUNTANT'].includes(role)) redirect('/dashboard')

  const reports = [
    {
      href: '/reports/profitability',
      icon: TrendingUp,
      label: 'Profitability',
      desc: 'Per-project P&L: quoted revenue, materials cost, labor cost, gross margin',
    },
    {
      href: '/reports/hours',
      icon: Clock,
      label: 'Worker Hours',
      desc: 'Hours and estimated earnings per worker for a date range',
    },
    {
      href: '/reports/suppliers',
      icon: Package,
      label: 'Supplier Spend',
      desc: 'Total spend per vendor from approved receipts',
    },
    {
      href: '/reports/invoices',
      icon: Receipt,
      label: 'Invoices',
      desc: 'All invoices with amounts, status, and payment history',
    },
  ]

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <BarChart2 size={20} className="text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reports.map((r) => (
          <Link key={r.href} href={r.href}
            className="bg-card border border-border rounded-lg p-5 hover:border-primary/50 transition-colors group">
            <div className="flex items-center gap-3 mb-2">
              <r.icon size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="font-semibold text-foreground">{r.label}</span>
            </div>
            <p className="text-sm text-muted-foreground">{r.desc}</p>
          </Link>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Download size={16} className="text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">CSV Exports</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { type: 'profitability', label: 'Profitability' },
            { type: 'hours', label: 'Worker Hours' },
            { type: 'suppliers', label: 'Supplier Spend' },
            { type: 'invoices', label: 'Invoices' },
          ].map((e) => (
            <a key={e.type} href={`/api/reports/export?type=${e.type}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
              <Download size={12} />{e.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
