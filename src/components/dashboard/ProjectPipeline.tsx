'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutGrid, List } from 'lucide-react'

interface Project {
  id: string
  name: string
  status: string
  projectType: string
  customerName: string
  quoteTotal: number
  balance: number
  startDate: string | null
}

interface Props {
  projects: Project[]
}

const STATUS_ORDER = ['LEAD', 'QUOTED', 'APPROVED', 'SCHEDULED', 'IN_PROGRESS', 'PUNCH_LIST', 'COMPLETE', 'INVOICED', 'PAID']
const STATUS_LABELS: Record<string, string> = {
  LEAD: 'Lead', QUOTED: 'Quoted', APPROVED: 'Approved', SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress', PUNCH_LIST: 'Punch List', COMPLETE: 'Complete',
  INVOICED: 'Invoiced', PAID: 'Paid', ARCHIVED: 'Archived',
}
const STATUS_COLORS: Record<string, string> = {
  LEAD: 'bg-muted text-muted-foreground',
  QUOTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  SCHEDULED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  PUNCH_LIST: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  COMPLETE: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  INVOICED: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
}

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function KanbanView({ projects }: { projects: Project[] }) {
  const activeStatuses = STATUS_ORDER.filter((s) => projects.some((p) => p.status === s))
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {activeStatuses.map((status) => {
        const group = projects.filter((p) => p.status === status)
        return (
          <div key={status} className="flex-shrink-0 w-56">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground'}`}>
                {STATUS_LABELS[status] ?? status}
              </span>
              <span className="text-xs text-muted-foreground">{group.length}</span>
            </div>
            <div className="space-y-2">
              {group.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`}
                  className="block bg-card border border-border rounded-lg p-3 hover:border-primary/50 transition-colors">
                  <p className="text-sm font-medium text-foreground leading-tight truncate">{p.name}</p>
                  {p.customerName && <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.customerName}</p>}
                  {p.quoteTotal > 0 && <p className="text-xs font-medium text-foreground mt-1">{fmt(p.quoteTotal)}</p>}
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TableView({ projects }: { projects: Project[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Project</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer</th>
            <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Quote</th>
            <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Balance</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Start</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors">
              <td className="py-2.5 px-3">
                <Link href={`/projects/${p.id}`} className="font-medium text-foreground hover:text-primary">{p.name}</Link>
              </td>
              <td className="py-2.5 px-3">
                <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[p.status] ?? 'bg-muted text-muted-foreground'}`}>
                  {STATUS_LABELS[p.status] ?? p.status}
                </span>
              </td>
              <td className="py-2.5 px-3 text-muted-foreground">{p.customerName || '-'}</td>
              <td className="py-2.5 px-3 text-right tabular-nums">{p.quoteTotal > 0 ? fmt(p.quoteTotal) : '-'}</td>
              <td className="py-2.5 px-3 text-right tabular-nums">{p.balance > 0 ? fmt(p.balance) : '-'}</td>
              <td className="py-2.5 px-3 text-muted-foreground">
                {p.startDate ? new Date(p.startDate).toLocaleDateString() : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ProjectPipeline({ projects }: Props) {
  const [view, setView] = useState<'kanban' | 'table'>('kanban')

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Project Pipeline ({projects.length})</h2>
        <div className="flex items-center gap-1 bg-muted rounded-md p-1">
          <button onClick={() => setView('kanban')}
            className={`p-1.5 rounded transition-colors ${view === 'kanban' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <LayoutGrid size={14} />
          </button>
          <button onClick={() => setView('table')}
            className={`p-1.5 rounded transition-colors ${view === 'table' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <List size={14} />
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      ) : view === 'kanban' ? (
        <KanbanView projects={projects} />
      ) : (
        <TableView projects={projects} />
      )}
    </section>
  )
}
