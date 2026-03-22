'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface LogData {
  id: string
  projectName: string
  userName: string
  clockInAt: string
  clockOutAt: string | null
  breakMinutes: number
  totalMinutes: number | null
  notes: string
  approvedAt: string | null
}

interface Props {
  log: LogData
  canApprove: boolean
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function TimeLogEditForm({ log, canApprove }: Props) {
  const router = useRouter()
  const [clockIn, setClockIn] = useState(toDatetimeLocal(log.clockInAt))
  const [clockOut, setClockOut] = useState(log.clockOutAt ? toDatetimeLocal(log.clockOutAt) : '')
  const [breakMins, setBreakMins] = useState(String(log.breakMinutes))
  const [notes, setNotes] = useState(log.notes)
  const [approve, setApprove] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    const res = await fetch(`/api/time-logs/${log.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clockInAt: new Date(clockIn).toISOString(),
        clockOutAt: clockOut ? new Date(clockOut).toISOString() : null,
        breakMinutes: parseInt(breakMins) || 0,
        notes,
        approved: approve,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Save failed'); return }
    router.push('/time')
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Delete this time log?')) return
    setDeleting(true)
    const res = await fetch(`/api/time-logs/${log.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) { setError('Delete failed'); return }
    router.push('/time')
    router.refresh()
  }

  // Compute preview total
  function previewTotal() {
    if (!clockOut) return null
    const inMs = new Date(clockIn).getTime()
    const outMs = new Date(clockOut).getTime()
    const breakMs = (parseInt(breakMins) || 0) * 60000
    const mins = Math.max(0, Math.round((outMs - inMs - breakMs) / 60000))
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const preview = previewTotal()

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {log.approvedAt && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <p className="text-xs text-green-700 dark:text-green-400 font-medium">
            Approved on {new Date(log.approvedAt).toLocaleDateString()}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Clock In</label>
          <input
            type="datetime-local"
            value={clockIn}
            onChange={(e) => setClockIn(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Clock Out</label>
          <input
            type="datetime-local"
            value={clockOut}
            onChange={(e) => setClockOut(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Break (minutes)</label>
          <input
            type="number"
            min="0"
            value={breakMins}
            onChange={(e) => setBreakMins(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {preview && (
          <p className="text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">{preview}</span></p>
        )}

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        {canApprove && !log.approvedAt && (
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={approve}
              onChange={(e) => setApprove(e.target.checked)}
              className="rounded border-input"
            />
            Mark as approved
          </label>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-medium py-2.5 rounded-md text-sm transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2.5 rounded-md border border-destructive text-destructive hover:bg-destructive/10 disabled:opacity-60 text-sm font-medium transition-colors"
        >
          {deleting ? '...' : 'Delete'}
        </button>
      </div>
    </div>
  )
}
