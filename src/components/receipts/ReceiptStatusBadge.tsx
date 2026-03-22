interface Props { status: string }

const STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  REVIEWED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

const LABELS: Record<string, string> = {
  PENDING: 'Pending', REVIEWED: 'Reviewed', APPROVED: 'Approved', REJECTED: 'Rejected',
}

export default function ReceiptStatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STYLES[status] ?? 'bg-muted text-muted-foreground'}`}>
      {LABELS[status] ?? status}
    </span>
  )
}
