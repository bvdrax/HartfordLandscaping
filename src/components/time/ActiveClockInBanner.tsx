'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Clock, X } from 'lucide-react'

interface ActiveLog {
  id: string
  clockInAt: string
  project: { id: string; name: string }
}

function formatDuration(startIso: string) {
  const ms = Date.now() - new Date(startIso).getTime()
  const totalMins = Math.floor(ms / 60000)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function ActiveClockInBanner() {
  const [active, setActive] = useState<ActiveLog | null>(null)
  const [elapsed, setElapsed] = useState('')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/time-logs/active')
      .then((r) => r.json())
      .then((d) => { if (d.data) setActive(d.data) })
  }, [])

  useEffect(() => {
    if (!active) return
    const update = () => setElapsed(formatDuration(active.clockInAt))
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [active])

  if (!active || dismissed) return null

  return (
    <div className="bg-green-600 text-white px-4 py-2 flex items-center gap-3 text-sm">
      <div className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
      <Clock size={14} className="shrink-0" />
      <span className="flex-1 truncate">
        Clocked in to <Link href="/time" className="font-semibold underline underline-offset-2">{active.project.name}</Link>
        {' - '}{elapsed}
      </span>
      <Link href="/time" className="shrink-0 text-white/80 hover:text-white font-medium text-xs">
        Clock out
      </Link>
      <button onClick={() => setDismissed(true)} className="shrink-0 text-white/60 hover:text-white">
        <X size={14} />
      </button>
    </div>
  )
}
