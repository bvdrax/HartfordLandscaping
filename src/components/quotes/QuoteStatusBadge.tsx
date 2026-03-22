const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT:      { label: 'Draft',     className: 'bg-muted text-muted-foreground' },
  SENT:       { label: 'Sent',      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  APPROVED:   { label: 'Approved',  className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  REJECTED:   { label: 'Rejected',  className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  SUPERSEDED: { label: 'Superseded',className: 'bg-muted text-muted-foreground line-through' },
  EXPIRED:    { label: 'Expired',   className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
}

export default function QuoteStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-muted text-muted-foreground' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${cfg.className}`}>{cfg.label}</span>
}
