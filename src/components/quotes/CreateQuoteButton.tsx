'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

export default function CreateQuoteButton({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    setLoading(true)
    const res = await fetch(`/api/projects/${projectId}/quotes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    const json = await res.json()
    setLoading(false)
    if (res.ok) router.push(`/quotes/${json.data.quote.id}`)
  }

  return (
    <button
      onClick={handleCreate}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
    >
      <Plus size={14} />{loading ? 'Creating...' : 'New Quote'}
    </button>
  )
}
