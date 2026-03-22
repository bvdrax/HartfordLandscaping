'use client'

import { useState, useEffect } from 'react'
import { Clock, LogIn, LogOut, MapPin, WifiOff } from 'lucide-react'
import { enqueue } from '@/lib/offline-db'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

interface Project {
  id: string
  name: string
}

interface ActiveLog {
  id: string
  projectId: string
  clockInAt: string
  project: { id: string; name: string }
}

interface Props {
  projects: Project[]
  onClockIn?: (log: ActiveLog) => void
  onClockOut?: () => void
}

function getGPS(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000 }
    )
  })
}

function formatDuration(startIso: string) {
  const ms = Date.now() - new Date(startIso).getTime()
  const totalMins = Math.floor(ms / 60000)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function ClockInButton({ projects, onClockIn, onClockOut }: Props) {
  const online = useOnlineStatus()
  const [active, setActive] = useState<ActiveLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedProject, setSelectedProject] = useState('')
  const [breakMinutes, setBreakMinutes] = useState('')
  const [notes, setNotes] = useState('')
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'acquiring' | 'done' | 'denied'>('idle')
  const [elapsed, setElapsed] = useState('')
  const [error, setError] = useState('')

  // Fetch active session
  useEffect(() => {
    fetch('/api/time-logs/active')
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setActive(d.data)
      })
      .finally(() => setLoading(false))
  }, [])

  // Tick elapsed timer
  useEffect(() => {
    if (!active) return
    const update = () => setElapsed(formatDuration(active.clockInAt))
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [active])

  async function handleClockIn() {
    if (!selectedProject) { setError('Select a project first'); return }
    setSubmitting(true)
    setError('')
    setGpsStatus('acquiring')
    const location = await getGPS()
    setGpsStatus(location ? 'done' : 'denied')

    const clockInAt = new Date().toISOString()

    if (!online) {
      // Queue for later sync
      await enqueue({ type: 'clock-in', payload: { projectId: selectedProject, location, clockInAt } })
      const project = projects.find((p) => p.id === selectedProject)
      const offlineActive: ActiveLog = { id: 'offline', projectId: selectedProject, clockInAt, project: { id: selectedProject, name: project?.name ?? 'Unknown' } }
      setActive(offlineActive)
      onClockIn?.(offlineActive)
      setSubmitting(false)
      setGpsStatus('idle')
      return
    }

    const res = await fetch('/api/time-logs/clock-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: selectedProject, location }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error ?? 'Failed to clock in'); return }
    setActive(data.data)
    onClockIn?.(data.data)
    setGpsStatus('idle')
  }

  async function handleClockOut() {
    setSubmitting(true)
    setError('')
    setGpsStatus('acquiring')
    const location = await getGPS()
    setGpsStatus(location ? 'done' : 'denied')

    if (!online) {
      const breakMins = breakMinutes ? parseInt(breakMinutes) : 0
      await enqueue({ type: 'clock-out', payload: { location, breakMinutes: breakMins, notes: notes || null, clockOutAt: new Date().toISOString() } })
      setActive(null)
      setBreakMinutes('')
      setNotes('')
      setSubmitting(false)
      setGpsStatus('idle')
      onClockOut?.()
      return
    }

    const res = await fetch('/api/time-logs/clock-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location,
        breakMinutes: breakMinutes ? parseInt(breakMinutes) : 0,
        notes: notes || null,
      }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error ?? 'Failed to clock out'); return }
    setActive(null)
    setBreakMinutes('')
    setNotes('')
    setGpsStatus('idle')
    onClockOut?.()
  }

  if (loading) return <div className="h-32 animate-pulse bg-muted rounded-xl" />

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {active ? (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <div>
              <p className="font-semibold text-foreground">Clocked in</p>
              <p className="text-sm text-muted-foreground">{active.project.name}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-2xl font-bold tabular-nums text-green-700 dark:text-green-400">{elapsed}</p>
              <p className="text-xs text-muted-foreground">elapsed</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground w-28 shrink-0">Break (mins)</label>
              <input
                type="number"
                min="0"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(e.target.value)}
                placeholder="0"
                className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground w-28 shrink-0">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
                className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <button
            onClick={handleClockOut}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold text-lg py-4 rounded-xl transition-colors"
          >
            <LogOut size={22} />
            {submitting ? 'Clocking out...' : 'Clock Out'}
          </button>

          {gpsStatus === 'acquiring' && (
            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={12} />Getting location...</p>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock size={18} />
            <span className="font-medium text-foreground">Clock In</span>
            {!online && (
              <span className="ml-auto flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <WifiOff size={12} />Offline
              </span>
            )}
          </div>

          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Select project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <button
            onClick={handleClockIn}
            disabled={submitting || !selectedProject}
            className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-semibold text-lg py-4 rounded-xl transition-colors"
          >
            <LogIn size={22} />
            {submitting ? 'Clocking in...' : 'Clock In'}
          </button>

          {gpsStatus === 'acquiring' && (
            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={12} />Getting location...</p>
          )}
        </div>
      )}
    </div>
  )
}
