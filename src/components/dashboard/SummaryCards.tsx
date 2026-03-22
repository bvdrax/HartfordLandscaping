import { FolderOpen, FileText, Receipt, Clock } from 'lucide-react'

interface Props {
  activeProjects: number
  openQuotes: number
  unpaidInvoices: number
  unpaidAmount: number
  weekHours: number
}

export default function SummaryCards({ activeProjects, openQuotes, unpaidInvoices, unpaidAmount, weekHours }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <FolderOpen size={16} />
          <span className="text-xs font-medium uppercase tracking-wide">Active Projects</span>
        </div>
        <p className="text-3xl font-bold text-foreground">{activeProjects}</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <FileText size={16} />
          <span className="text-xs font-medium uppercase tracking-wide">Open Quotes</span>
        </div>
        <p className="text-3xl font-bold text-foreground">{openQuotes}</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Receipt size={16} />
          <span className="text-xs font-medium uppercase tracking-wide">Unpaid Invoices</span>
        </div>
        <p className="text-3xl font-bold text-foreground">{unpaidInvoices}</p>
        <p className="text-sm text-muted-foreground">${unpaidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Clock size={16} />
          <span className="text-xs font-medium uppercase tracking-wide">Crew Hours (Week)</span>
        </div>
        <p className="text-3xl font-bold text-foreground">{weekHours.toFixed(1)}h</p>
      </div>
    </div>
  )
}
