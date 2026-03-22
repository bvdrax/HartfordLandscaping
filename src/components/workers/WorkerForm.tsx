'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Crew {
  id: string
  name: string
}

interface WorkerData {
  id?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  hourlyRate: string
  payType: string
  crewId: string
  emergencyContact: string
  notes: string
  isActive: boolean
}

interface Props {
  crews: Crew[]
  initial?: Partial<WorkerData>
  workerId?: string
}

const WORKER_ROLES = ['FIELD_WORKER', 'PROJECT_MANAGER', 'ACCOUNTANT', 'SUBCONTRACTOR', 'OWNER']
const PAY_TYPES = [{ value: 'HOURLY', label: 'Hourly' }, { value: 'SALARY', label: 'Salary' }, { value: 'SUBCONTRACT', label: 'Subcontract' }]
const ROLE_LABELS: Record<string, string> = {
  FIELD_WORKER: 'Field Worker', PROJECT_MANAGER: 'Project Manager', ACCOUNTANT: 'Accountant',
  SUBCONTRACTOR: 'Subcontractor', OWNER: 'Owner',
}

export default function WorkerForm({ crews, initial, workerId }: Props) {
  const router = useRouter()
  const isEdit = !!workerId

  const [form, setForm] = useState<WorkerData>({
    firstName: initial?.firstName ?? '',
    lastName: initial?.lastName ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    role: initial?.role ?? 'FIELD_WORKER',
    hourlyRate: initial?.hourlyRate ?? '',
    payType: initial?.payType ?? 'HOURLY',
    crewId: initial?.crewId ?? '',
    emergencyContact: initial?.emergencyContact ?? '',
    notes: initial?.notes ?? '',
    isActive: initial?.isActive ?? true,
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(key: keyof WorkerData, val: string | boolean) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const url = isEdit ? `/api/workers/${workerId}` : '/api/workers'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        hourlyRate: form.hourlyRate || null,
        crewId: form.crewId || null,
        phone: form.phone || null,
      }),
    })

    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Failed to save'); return }
    router.push('/workers')
    router.refresh()
  }

  const inputCls = 'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary'
  const labelCls = 'text-xs font-medium text-muted-foreground uppercase tracking-wide'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>First Name</label>
          <input required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Last Name</label>
          <input required value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Email</label>
        <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} disabled={isEdit} />
      </div>

      <div>
        <label className={labelCls}>Phone</label>
        <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+1..." className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Role</label>
          <select value={form.role} onChange={(e) => set('role', e.target.value)} className={inputCls}>
            {WORKER_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Pay Type</label>
          <select value={form.payType} onChange={(e) => set('payType', e.target.value)} className={inputCls}>
            {PAY_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {form.payType === 'HOURLY' && (
        <div>
          <label className={labelCls}>Hourly Rate ($)</label>
          <input type="number" min="0" step="0.01" value={form.hourlyRate} onChange={(e) => set('hourlyRate', e.target.value)} placeholder="0.00" className={inputCls} />
        </div>
      )}

      <div>
        <label className={labelCls}>Crew</label>
        <select value={form.crewId} onChange={(e) => set('crewId', e.target.value)} className={inputCls}>
          <option value="">No crew</option>
          {crews.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <label className={labelCls}>Emergency Contact</label>
        <input value={form.emergencyContact} onChange={(e) => set('emergencyContact', e.target.value)} placeholder="Name and phone" className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Notes</label>
        <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} className={inputCls + ' resize-none'} />
      </div>

      {isEdit && (
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="rounded border-input" />
          Active
        </label>
      )}

      <button type="submit" disabled={saving}
        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-medium py-2.5 rounded-md text-sm transition-colors">
        {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Worker'}
      </button>
    </form>
  )
}
