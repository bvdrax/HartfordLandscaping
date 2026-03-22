'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, CreditCard, Trash2, ExternalLink } from 'lucide-react'

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CHECK', label: 'Check' },
  { value: 'ZELLE', label: 'Zelle' },
  { value: 'VENMO', label: 'Venmo' },
  { value: 'ACH', label: 'ACH' },
  { value: 'OTHER', label: 'Other' },
]

interface Props {
  invoiceId: string
  status: string
  total: number
  amountPaid: number
  stripePaymentIntentId: string | null
  canEdit: boolean
  canVoid: boolean
}

export default function InvoiceActions({ invoiceId, status, total, amountPaid, stripePaymentIntentId, canEdit, canVoid }: Props) {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState<string | null>(null)
  const [showPayForm, setShowPayForm] = useState(false)
  const [payAmount, setPayAmount] = useState((total - amountPaid).toFixed(2))
  const [payMethod, setPayMethod] = useState('CASH')
  const [payRef, setPayRef] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [voiding, setVoiding] = useState(false)

  const isVoid = status === 'VOID'
  const isPaid = status === 'PAID'
  const balance = total - amountPaid

  async function handleSend() {
    setSending(true)
    setSendError(null)
    setSendSuccess(null)
    const res = await fetch('/api/invoices/' + invoiceId + '/send', { method: 'POST' })
    const json = await res.json()
    setSending(false)
    if (!res.ok) { setSendError(json.error ?? 'Failed to send'); return }
    setSendSuccess('Sent to ' + json.data.to)
    router.refresh()
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    setPaying(true)
    setPayError(null)
    const res = await fetch('/api/invoices/' + invoiceId + '/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(payAmount), paymentMethod: payMethod, referenceNumber: payRef || null, notes: payNotes || null }),
    })
    const json = await res.json()
    setPaying(false)
    if (!res.ok) { setPayError(json.error ?? 'Failed to record payment'); return }
    setShowPayForm(false)
    router.refresh()
  }

  async function handleVoid() {
    if (!confirm('Are you sure you want to void this invoice? This cannot be undone.')) return
    setVoiding(true)
    const res = await fetch('/api/invoices/' + invoiceId, { method: 'DELETE' })
    setVoiding(false)
    if (res.ok) { router.push('/invoices'); router.refresh() }
  }

  const inputCls = 'w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30'

  return (
    <div className="space-y-3">
      {canEdit && !isVoid && !isPaid && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#2D6A4F' }}
          >
            <Send size={14} />{sending ? 'Sending...' : 'Send Invoice'}
          </button>
          <button
            onClick={() => setShowPayForm(!showPayForm)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium border border-border text-muted-foreground hover:text-foreground"
          >
            <CreditCard size={14} />Record Payment
          </button>
        </div>
      )}

      {sendError && <p className="text-xs text-destructive">{sendError}</p>}
      {sendSuccess && <p className="text-xs text-green-700 dark:text-green-400">{sendSuccess}</p>}

      {stripePaymentIntentId && (
        <a
          href={'https://dashboard.stripe.com/payments/' + stripePaymentIntentId}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground w-fit"
        >
          <ExternalLink size={12} />View in Stripe
        </a>
      )}

      {showPayForm && (
        <form onSubmit={handlePay} className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Record Payment</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Amount ($)</label>
              <input
                type="number"
                min="0.01"
                max={balance.toFixed(2)}
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Method</label>
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className={inputCls} required>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Reference # (optional)</label>
            <input type="text" value={payRef} onChange={(e) => setPayRef(e.target.value)} className={inputCls} placeholder="Check #, transaction ID..." />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Notes (optional)</label>
            <input type="text" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} className={inputCls} />
          </div>
          {payError && <p className="text-xs text-destructive">{payError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={paying} className="px-4 py-1.5 rounded-md text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#2D6A4F' }}>
              {paying ? 'Saving...' : 'Save Payment'}
            </button>
            <button type="button" onClick={() => setShowPayForm(false)} className="px-4 py-1.5 rounded-md text-sm text-muted-foreground border border-border hover:text-foreground">
              Cancel
            </button>
          </div>
        </form>
      )}

      {canVoid && !isVoid && (
        <button
          onClick={handleVoid}
          disabled={voiding}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
        >
          <Trash2 size={12} />{voiding ? 'Voiding...' : isPaid ? 'Void Invoice' : 'Void / Delete'}
        </button>
      )}
    </div>
  )
}
