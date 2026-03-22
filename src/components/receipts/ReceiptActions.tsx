'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle } from 'lucide-react'

interface Props {
  receiptId: string
  status: string
  canApprove: boolean
}

export default function ReceiptActions({ receiptId, status, canApprove }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function updateStatus(newStatus: string) {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/receipts/${receiptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed'); return }
    router.refresh()
  }

  if (!canApprove) return null
  if (status === 'APPROVED' || status === 'REJECTED') return null

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-3">
        <button onClick={() => updateStatus('APPROVED')} disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-md text-sm transition-colors">
          <CheckCircle size={16} />Approve
        </button>
        <button onClick={() => updateStatus('REJECTED')} disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-md text-sm transition-colors">
          <XCircle size={16} />Reject
        </button>
      </div>
    </div>
  )
}
