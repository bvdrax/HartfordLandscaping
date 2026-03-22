'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Project { id: string; name: string }
interface Quote { id: string; versionNumber: number; total: number }

interface InvoiceFormProps {
  projects: Project[]
  defaultProjectId?: string
  quotes?: Quote[]
  initial?: {
    id: string
    type: string
    amountDue: number
    taxRate: number
    dueDate: string | null
    notes: string | null
    quoteId: string | null
  }
}

const INVOICE_TYPES = [
  { value: 'DEPOSIT', label: 'Deposit' },
  { value: 'MILESTONE', label: 'Milestone' },
  { value: 'FINAL', label: 'Final' },
  { value: 'RECURRING', label: 'Recurring' },
]

export default function InvoiceForm({ projects, defaultProjectId, quotes, initial }: InvoiceFormProps) {
  const router = useRouter()
  const isEdit = !!initial

  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? '')
  const [quoteId, setQuoteId] = useState(initial?.quoteId ?? '')
  const [type, setType] = useState(initial?.type ?? 'FINAL')
  const [amountDue, setAmountDue] = useState(initial?.amountDue?.toString() ?? '')
  const [taxRate, setTaxRate] = useState(
    initial?.taxRate ? (initial.taxRate * 100).toFixed(2) : '0'
  )
  const [dueDate, setDueDate] = useState(
    initial?.dueDate ? initial.dueDate.slice(0, 10) : ''
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const taxRateDecimal = Number(taxRate) / 100
  const amountNum = Number(amountDue) || 0
  const taxAmount = Math.round(amountNum * taxRateDecimal * 100) / 100
  const total = Math.round((amountNum + taxAmount) * 100) / 100

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const body = {
      projectId,
      quoteId: quoteId || null,
      type,
      amountDue: Number(amountDue),
      taxRate: taxRateDecimal,
      dueDate: dueDate || null,
      notes: notes || null,
    }

    const res = isEdit
      ? await fetch('/api/invoices/' + initial!.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(json.error ?? 'Failed to save'); return }
    router.push('/invoices/' + (isEdit ? initial!.id : json.data.id))
    router.refresh()
  }

  const inputCls = 'w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30'
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {!isEdit && (
        <div>
          <label className={labelCls}>Project *</label>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls} required>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      {quotes && quotes.length > 0 && (
        <div>
          <label className={labelCls}>Linked Quote (optional)</label>
          <select value={quoteId} onChange={(e) => setQuoteId(e.target.value)} className={inputCls}>
            <option value="">None</option>
            {quotes.map((q) => (
              <option key={q.id} value={q.id}>v{q.versionNumber} — ${q.total.toFixed(2)}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={labelCls}>Invoice Type *</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls} required>
          {INVOICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Amount Due ($) *</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amountDue}
            onChange={(e) => setAmountDue(e.target.value)}
            className={inputCls}
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <label className={labelCls}>Tax Rate (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            className={inputCls}
            placeholder="0"
          />
        </div>
      </div>

      {amountNum > 0 && (
        <div className="text-sm text-muted-foreground bg-muted/30 rounded-md px-3 py-2 space-y-0.5">
          <div className="flex justify-between"><span>Subtotal</span><span>${amountNum.toFixed(2)}</span></div>
          {taxAmount > 0 && <div className="flex justify-between"><span>Tax</span><span>${taxAmount.toFixed(2)}</span></div>}
          <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1 mt-1"><span>Total</span><span>${total.toFixed(2)}</span></div>
        </div>
      )}

      <div>
        <label className={labelCls}>Due Date</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={inputCls + ' resize-none'}
          placeholder="Optional notes..."
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: '#2D6A4F' }}
        >
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Invoice'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2 rounded-md text-sm font-medium border border-border text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
