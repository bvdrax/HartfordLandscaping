const CLASSES: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PARTIAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  VOID: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const LABELS: Record<string, string> = {
  DRAFT: 'Draft', SENT: 'Sent', PARTIAL: 'Partial', PAID: 'Paid', VOID: 'Void',
}

export default function InvoiceStatusBadge({ status }: { status: string }) {
  return (
    <span className={'text-[11px] font-medium px-2 py-0.5 rounded ' + (CLASSES[status] ?? CLASSES.DRAFT)}>
      {LABELS[status] ?? status}
    </span>
  )
}
