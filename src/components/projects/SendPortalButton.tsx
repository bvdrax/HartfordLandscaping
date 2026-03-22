'use client'

import { useState } from 'react'
import { Link2 } from 'lucide-react'

export default function SendPortalButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/projects/${projectId}/portal`, { method: 'POST' })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Failed to send portal link'); return }
    setSent(true)
  }

  if (sent) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
        <Link2 size={14} />Portal link sent
      </span>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSend}
        disabled={loading}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
      >
        <Link2 size={14} />{loading ? 'Sending...' : 'Send Portal Link'}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
