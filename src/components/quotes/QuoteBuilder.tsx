'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Trash2, Send, Pencil } from 'lucide-react'

interface Sku { id: string; name: string; unitOfMeasure: string; basePrice: number }
interface LineItem {
  id: string; description: string; quantity: number; unitPrice: number
  laborPricePerUnit: number; lineTotal: number
  sku: { id: string; name: string; unitOfMeasure: string } | null
}
interface Quote {
  id: string; status: string; versionNumber: number; notes: string | null
  termsAndConditions: string | null; globalMarginPct: number
  materialsTotal: number; laborTotal: number; taxTotal: number; total: number
  lineItems: LineItem[]
}

interface QuoteBuilderProps { quote: Quote; availableSkus: Sku[]; canEdit: boolean }

const fmt = (n: number) => '$' + Number(n).toFixed(2)
const BLANK_LINE = { description: '', quantity: '1', unitPrice: '', laborPricePerUnit: '0', skuId: '' }

function parseLineItems(raw: LineItem[]) {
  return raw.map((li) => ({ ...li, quantity: Number(li.quantity), unitPrice: Number(li.unitPrice), laborPricePerUnit: Number(li.laborPricePerUnit), lineTotal: Number(li.lineTotal) }))
}

export default function QuoteBuilder({ quote: initialQuote, availableSkus, canEdit }: QuoteBuilderProps) {
  const [quote, setQuote] = useState(initialQuote)
  const [showAddLine, setShowAddLine] = useState(false)
  const [lineForm, setLineForm] = useState({ ...BLANK_LINE })
  const [editingLineId, setEditingLineId] = useState<string | null>(null)
  const [editLineForm, setEditLineForm] = useState({ description: '', quantity: '', unitPrice: '', laborPricePerUnit: '' })
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [skuSearch, setSkuSearch] = useState('')
  const [showSkuList, setShowSkuList] = useState(false)

  const isDraft = quote.status === 'DRAFT'
  const isSent = quote.status === 'SENT'

  const filteredSkus = availableSkus.filter(
    (s) => s.name.toLowerCase().includes(skuSearch.toLowerCase())
  ).slice(0, 8)

  function selectSku(sku: Sku) {
    const margin = Number(quote.globalMarginPct)
    const sellPrice = (Number(sku.basePrice) * (1 + margin / 100)).toFixed(2)
    setLineForm({ ...lineForm, skuId: sku.id, description: sku.name, unitPrice: sellPrice })
    setSkuSearch(sku.name)
    setShowSkuList(false)
  }

  async function refreshQuote() {
    const res = await fetch('/api/quotes/' + quote.id)
    if (!res.ok) return
    const json = await res.json()
    const q = json.data.quote
    setQuote({
      ...q,
      globalMarginPct: Number(q.globalMarginPct),
      materialsTotal: Number(q.materialsTotal),
      laborTotal: Number(q.laborTotal),
      taxTotal: Number(q.taxTotal),
      total: Number(q.total),
      lineItems: parseLineItems(q.lineItems),
    })
  }

  async function handleAddLine(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const body = { ...lineForm, skuId: lineForm.skuId || undefined }
    const res = await fetch('/api/quotes/' + quote.id + '/line-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(json.error ?? 'Failed to add line'); return }
    await refreshQuote()
    setLineForm({ ...BLANK_LINE })
    setSkuSearch('')
    setShowAddLine(false)
  }

  async function handleUpdateLine(id: string) {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/quotes/' + quote.id + '/line-items/' + id, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editLineForm),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(json.error ?? 'Failed to update'); return }
    await refreshQuote()
    setEditingLineId(null)
  }

  async function handleDeleteLine(id: string) {
    if (!confirm('Remove this line item?')) return
    const res = await fetch('/api/quotes/' + quote.id + '/line-items/' + id, { method: 'DELETE' })
    if (res.ok) await refreshQuote()
  }

  async function handleSend() {
    if (!confirm('Mark as SENT? Line items cannot be edited after sending.')) return
    setSending(true)
    const res = await fetch('/api/quotes/' + quote.id + '/send', { method: 'POST' })
    const json = await res.json()
    setSending(false)
    if (!res.ok) { setError(json.error ?? 'Failed to send'); return }
    setQuote((prev) => ({ ...prev, status: 'SENT' }))
    window.location.reload()
  }

  async function handleStatusUpdate(status: string) {
    setStatusUpdating(true)
    const res = await fetch('/api/quotes/' + quote.id, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    setStatusUpdating(false)
    if (res.ok) { setQuote((p) => ({ ...p, status })); window.location.reload() }
  }

  function startEditLine(li: LineItem) {
    setEditingLineId(li.id)
    setEditLineForm({ description: li.description, quantity: String(li.quantity), unitPrice: String(li.unitPrice), laborPricePerUnit: String(li.laborPricePerUnit) })
  }

  return (
    <div className="space-y-6">
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Description</th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground w-20">Qty</th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground w-24">Unit Price</th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground w-24">Labor</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground w-24">Total</th>
              {isDraft && canEdit && <th className="w-16" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {quote.lineItems.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No line items yet.</td>
              </tr>
            )}
            {quote.lineItems.map((li) => (
              <tr key={li.id} className="bg-card">
                {editingLineId === li.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input value={editLineForm.description} onChange={(e) => setEditLineForm({ ...editLineForm, description: e.target.value })}
                        className="w-full text-sm border border-border rounded px-2 py-1 bg-background" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.001" min="0" value={editLineForm.quantity} onChange={(e) => setEditLineForm({ ...editLineForm, quantity: e.target.value })}
                        className="w-full text-sm border border-border rounded px-2 py-1 bg-background text-right" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" min="0" value={editLineForm.unitPrice} onChange={(e) => setEditLineForm({ ...editLineForm, unitPrice: e.target.value })}
                        className="w-full text-sm border border-border rounded px-2 py-1 bg-background text-right" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" min="0" value={editLineForm.laborPricePerUnit} onChange={(e) => setEditLineForm({ ...editLineForm, laborPricePerUnit: e.target.value })}
                        className="w-full text-sm border border-border rounded px-2 py-1 bg-background text-right" />
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground text-xs">-</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => handleUpdateLine(li.id)} disabled={saving}
                          className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50">Save</button>
                        <button onClick={() => setEditingLineId(null)}
                          className="text-xs px-2 py-1 rounded border border-border text-muted-foreground">X</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{li.description}</p>
                      {li.sku && <p className="text-[10px] text-muted-foreground mt-0.5">SKU: {li.sku.name}</p>}
                    </td>
                    <td className="px-3 py-3 text-right text-foreground">{li.quantity}</td>
                    <td className="px-3 py-3 text-right text-foreground">{fmt(li.unitPrice)}</td>
                    <td className="px-3 py-3 text-right text-muted-foreground">{li.laborPricePerUnit > 0 ? fmt(li.laborPricePerUnit) : '-'}</td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">{fmt(li.lineTotal)}</td>
                    {isDraft && canEdit && (
                      <td className="px-2 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => startEditLine(li)} className="p-1 rounded text-muted-foreground hover:text-foreground">
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => handleDeleteLine(li.id)} className="p-1 rounded text-muted-foreground hover:text-destructive">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isDraft && canEdit && !showAddLine && (
        <button onClick={() => setShowAddLine(true)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <Plus size={14} />Add line item
        </button>
      )}

      {showAddLine && (
        <form onSubmit={handleAddLine} className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
          <p className="text-sm font-semibold text-foreground">New Line Item</p>
          <div className="relative">
            <label className="text-xs text-muted-foreground mb-1 block">Search SKU catalog (optional)</label>
            <input value={skuSearch} onChange={(e) => { setSkuSearch(e.target.value); setShowSkuList(true) }}
              onFocus={() => setShowSkuList(true)} placeholder="Type to search SKUs..."
              className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground placeholder:text-muted-foreground" />
            {showSkuList && skuSearch && filteredSkus.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {filteredSkus.map((s) => (
                  <button key={s.id} type="button" onClick={() => selectSku(s)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">${Number(s.basePrice).toFixed(2)} / {s.unitOfMeasure}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Description *</label>
              <input value={lineForm.description} onChange={(e) => setLineForm({ ...lineForm, description: e.target.value })} required
                className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Quantity *</label>
              <input type="number" step="0.001" min="0.001" value={lineForm.quantity} onChange={(e) => setLineForm({ ...lineForm, quantity: e.target.value })} required
                className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Unit Price (sell) *</label>
              <input type="number" step="0.01" min="0" value={lineForm.unitPrice} onChange={(e) => setLineForm({ ...lineForm, unitPrice: e.target.value })} required placeholder="0.00"
                className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground placeholder:text-muted-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Labor per Unit</label>
              <input type="number" step="0.01" min="0" value={lineForm.laborPricePerUnit} onChange={(e) => setLineForm({ ...lineForm, laborPricePerUnit: e.target.value })}
                className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground" />
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-1.5 rounded-md text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#2D6A4F' }}>
              {saving ? 'Adding...' : 'Add Line'}
            </button>
            <button type="button" onClick={() => { setShowAddLine(false); setLineForm({ ...BLANK_LINE }); setSkuSearch(''); setError(null) }}
              className="px-3 py-1.5 rounded-md text-sm border border-border text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </form>
      )}

      <div className="flex justify-end">
        <div className="w-64 space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Materials</span><span>{fmt(quote.materialsTotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Labor</span><span>{fmt(quote.laborTotal)}</span>
          </div>
          {quote.taxTotal > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span><span>{fmt(quote.taxTotal)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5 mt-1.5">
            <span>Total</span><span>{fmt(quote.total)}</span>
          </div>
        </div>
      </div>

      {canEdit && isDraft && (
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <button onClick={handleSend} disabled={sending || quote.lineItems.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: '#2D6A4F' }}>
            <Send size={14} />{sending ? 'Sending...' : 'Send to Customer'}
          </button>
          <p className="text-xs text-muted-foreground">Sets status to Sent with 30-day expiry.</p>
        </div>
      )}

      {canEdit && isSent && (
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <button onClick={() => handleStatusUpdate('APPROVED')} disabled={statusUpdating}
            className="px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: '#2D6A4F' }}>
            Mark Approved
          </button>
          <button onClick={() => handleStatusUpdate('REJECTED')} disabled={statusUpdating}
            className="px-4 py-2 rounded-md text-sm font-semibold border border-border text-muted-foreground hover:text-foreground disabled:opacity-50">
            Mark Rejected
          </button>
        </div>
      )}

      {error && !showAddLine && <p className="text-sm text-destructive">{error}</p>}

      <div className="pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quote.notes && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Notes</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}
        {quote.termsAndConditions && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Terms</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.termsAndConditions}</p>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">Margin: {Number(quote.globalMarginPct)}% (global default)</p>
    </div>
  )
}
