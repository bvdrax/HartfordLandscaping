import { ProjectStatus } from '@prisma/client'

const STATUS_CONFIG: Record<ProjectStatus, { label: string; className: string }> = {
  LEAD:        { label: 'Lead',        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  QUOTED:      { label: 'Quoted',      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  APPROVED:    { label: 'Approved',    className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  SCHEDULED:   { label: 'Scheduled',   className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  PUNCH_LIST:  { label: 'Punch List',  className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  COMPLETE:    { label: 'Complete',    className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  INVOICED:    { label: 'Invoiced',    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  PAID:        { label: 'Paid',        className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  ARCHIVED:    { label: 'Archived',    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
}

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  const { label, className } = STATUS_CONFIG[status] ?? STATUS_CONFIG.LEAD
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
