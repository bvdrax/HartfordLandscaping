'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
// Use plain string constants — avoid importing @prisma/client in client components
const PROJECT_STATUSES = ['LEAD', 'QUOTED', 'APPROVED', 'SCHEDULED', 'IN_PROGRESS', 'PUNCH_LIST', 'COMPLETE', 'INVOICED', 'PAID', 'ARCHIVED'] as const
type ProjectType = 'RESIDENTIAL' | 'COMMERCIAL' | 'HOA' | 'BUILDER'
type ProjectStatus = typeof PROJECT_STATUSES[number]

interface Crew { id: string; name: string }
interface Manager { id: string; firstName: string; lastName: string }

interface SiteAddress { street?: string; city?: string; state?: string; zip?: string }

interface ProjectData {
  id?: string
  name?: string
  projectType?: ProjectType
  status?: ProjectStatus
  siteAddress?: SiteAddress
  startDate?: string | null
  estimatedEndDate?: string | null
  estimatedHours?: number | null
  crewId?: string | null
  projectManagerId?: string | null
  notes?: string | null
  internalNotes?: string | null
}

interface Props {
  project?: ProjectData
  crews: Crew[]
  managers: Manager[]
  canEditInternalNotes: boolean
}

export default function ProjectForm({ project, crews, managers, canEditInternalNotes }: Props) {
  const router = useRouter()
  const addr = (project?.siteAddress ?? {}) as SiteAddress
  const isEdit = !!project?.id

  const [form, setForm] = useState({
    name: project?.name ?? '',
    projectType: project?.projectType ?? 'RESIDENTIAL',
    street: addr.street ?? '',
    city: addr.city ?? '',
    state: addr.state ?? '',
    zip: addr.zip ?? '',
    startDate: project?.startDate ? project.startDate.slice(0, 10) : '',
    estimatedEndDate: project?.estimatedEndDate ? project.estimatedEndDate.slice(0, 10) : '',
    estimatedHours: project?.estimatedHours?.toString() ?? '',
    crewId: project?.crewId ?? '',
    projectManagerId: project?.projectManagerId ?? '',
    notes: project?.notes ?? '',
    internalNotes: project?.internalNotes ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const url = isEdit ? `/api/projects/${project!.id}` : '/api/projects'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Something went wrong')
        setLoading(false)
        return
      }

      router.push(`/projects/${json.data.project.id}`)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Name & Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-1">Project Name *</label>
          <input
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Johnson Residence — Backyard Renovation"
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Project Type *</label>
          <select
            required
            value={form.projectType}
            onChange={(e) => update('projectType', e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="HOA">HOA</option>
            <option value="BUILDER">Builder</option>
          </select>
        </div>
        {isEdit && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Status</label>
            <select
              value={project?.status}
              onChange={(e) => update('status', e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Site Address */}
      <fieldset className="border border-border rounded-md p-4">
        <legend className="text-sm font-medium text-foreground px-1">Site Address</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <div className="sm:col-span-2">
            <input
              value={form.street}
              onChange={(e) => update('street', e.target.value)}
              placeholder="Street"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <input
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            placeholder="City"
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.state}
              onChange={(e) => update('state', e.target.value)}
              placeholder="State"
              maxLength={2}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              value={form.zip}
              onChange={(e) => update('zip', e.target.value)}
              placeholder="ZIP"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </fieldset>

      {/* Dates & Hours */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => update('startDate', e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Est. End Date</label>
          <input
            type="date"
            value={form.estimatedEndDate}
            onChange={(e) => update('estimatedEndDate', e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Est. Hours</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={form.estimatedHours}
            onChange={(e) => update('estimatedHours', e.target.value)}
            placeholder="40"
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Assignment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Project Manager</label>
          <select
            value={form.projectManagerId}
            onChange={(e) => update('projectManagerId', e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Unassigned</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Crew</label>
          <select
            value={form.crewId}
            onChange={(e) => update('crewId', e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Unassigned</option>
            {crews.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Customer preferences, site conditions..."
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {canEditInternalNotes && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Internal Notes <span className="text-muted-foreground text-xs">(not visible to crew)</span>
          </label>
          <textarea
            rows={3}
            value={form.internalNotes}
            onChange={(e) => update('internalNotes', e.target.value)}
            placeholder="Internal pricing notes, margin details..."
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-md text-white text-sm font-semibold disabled:opacity-60 transition-opacity"
          style={{ backgroundColor: '#2D6A4F' }}
        >
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Project'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-md border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
