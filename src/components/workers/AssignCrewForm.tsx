'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'

interface Crew {
  id: string
  name: string
  members: { user: { firstName: string; phone: string | null } }[]
}

interface Props {
  projectId: string
  crews: Crew[]
  currentCrewId: string | null
}

export default function AssignCrewForm({ projectId, crews, currentCrewId }: Props) {
  const router = useRouter()
  const [crewId, setCrewId] = useState(currentCrewId ?? '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [notify, setNotify] = useState(true)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ smsResults: { name: string; success: boolean }[] } | null>(null)
  const [error, setError] = useState('')

  const selectedCrew = crews.find((c) => c.id === crewId)
  const membersWithPhone = selectedCrew?.members.filter((m) => m.user.phone).length ?? 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!crewId || !startDate) { setError('Crew and start date are required'); return }
    setSaving(true)
    setError('')

    const res = await fetch(`/api/crew/${crewId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, startDate, endDate: endDate || null, notes: notes || null, notifyWorkers: notify }),
    })

    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Failed'); return }
    setResult(data.data)
    router.refresh()
  }

  const inputCls = 'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary'
  const labelCls = 'text-xs font-medium text-muted-foreground uppercase tracking-wide'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <p className="text-sm font-medium text-green-700 dark:text-green-300">Crew assigned!</p>
          {result.smsResults.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {result.smsResults.map((r, i) => (
                <li key={i} className="text-xs text-muted-foreground">
                  {r.name}: {r.success ? 'SMS sent' : 'SMS failed'}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div>
        <label className={labelCls}>Crew</label>
        <select value={crewId} onChange={(e) => setCrewId(e.target.value)} className={inputCls}>
          <option value="">Select crew...</option>
          {crews.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Notes</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className={inputCls} />
      </div>

      {membersWithPhone > 0 && (
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="rounded border-input" />
          <Send size={14} className="text-muted-foreground" />
          Notify {membersWithPhone} crew member{membersWithPhone !== 1 ? 's' : ''} via SMS
        </label>
      )}

      <button type="submit" disabled={saving}
        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-medium py-2.5 rounded-md text-sm transition-colors">
        {saving ? 'Assigning...' : 'Assign Crew'}
      </button>
    </form>
  )
}
