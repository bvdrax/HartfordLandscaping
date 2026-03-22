'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

const STATUSES = ['LEAD', 'QUOTED', 'APPROVED', 'SCHEDULED', 'IN_PROGRESS', 'PUNCH_LIST', 'COMPLETE', 'INVOICED', 'PAID', 'ARCHIVED'] as const

const STATUS_LABELS: Record<string, string> = {
  '': 'All',
  LEAD: 'Lead',
  QUOTED: 'Quoted',
  APPROVED: 'Approved',
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  PUNCH_LIST: 'Punch List',
  COMPLETE: 'Complete',
  INVOICED: 'Invoiced',
  PAID: 'Paid',
  ARCHIVED: 'Archived',
}

export default function ProjectFilters() {
  const router = useRouter()
  const params = useSearchParams()
  const [, startTransition] = useTransition()
  const current = params.get('status') ?? ''

  function setStatus(status: string) {
    const next = new URLSearchParams(params.toString())
    if (status) next.set('status', status)
    else next.delete('status')
    startTransition(() => router.push(`/projects?${next.toString()}`))
  }

  function setSearch(value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set('search', value)
    else next.delete('search')
    startTransition(() => router.push(`/projects?${next.toString()}`))
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <input
        defaultValue={params.get('search') ?? ''}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search projects..."
        className="w-full sm:w-72 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1">
        {(['', ...STATUSES] as string[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              current === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  )
}
