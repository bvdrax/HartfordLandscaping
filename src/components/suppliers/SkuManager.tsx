'use client'

import { useState } from 'react'
import { Plus, Pencil, Check, X } from 'lucide-react'

interface BulkTier { id: string; minQuantity: number; pricePerUnit: number }

interface Sku {
  id: string
  name: string
  description: string | null
  supplierItemNumber: string | null
  unitOfMeasure: string
  basePrice: number
  globalMarginPct: number | null
  notes: string | null
  isActive: boolean
  bulkPricingTiers: BulkTier[]
}

interface SkuManagerProps {
  supplierId: string
  initialSkus: Sku[]
  canEdit: boolean
}

const BLANK = { name: '', description: '', supplierItemNumber: '', unitOfMeasure: 'each', basePrice: '', globalMarginPct: '', notes: '' }

export default function SkuManager({ supplierId, initialSkus, canEdit }: SkuManagerProps) {
  const [skus, setSkus] = useState<Sku[]>(initialSkus)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ ...BLANK })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ ...BLANK })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered = skus.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || (s.supplierItemNumber ?? '').toLowerCase().includes(search.toLowerCase())
  )

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/suppliers/${supplierId}/skus`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(json.error ?? 'Failed to add SKU'); return }
    const sku = json.data.sku
    setSkus((prev) => [...prev, { ...sku, basePrice: Number(sku.basePrice), globalMarginPct: sku.globalMarginPct ? Number(sku.globalMarginPct) : null }])
    setForm({ ...BLANK })
    setShowAdd(false)
  }

  function startEdit(sku: Sku) {
    setEditingId(sku.id)
    setEditForm({
      name: sku.name,
      description: sku.description ?? '',
      supplierItemNumber: sku.supplierItemNumber ?? '',
      unitOfMeasure: sku.unitOfMeasure,
      basePrice: String(sku.basePrice),
      globalMarginPct: sku.globalMarginPct !== null ? String(sku.globalMarginPct) : '',
      notes: sku.notes ?? '',
    })
  }

  async function handleUpdate(id: string) {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/skus/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(json.error ?? 'Failed to save'); return }
    const sku = json.data.sku
    setSkus((prev) => prev.map((s) => s.id === id ? { ...sku, basePrice: Number(sku.basePrice), globalMarginPct: sku.globalMarginPct ? Number(sku.globalMarginPct) : null } : s))
    setEditingId(null)
  }

  async function handleDeactivate(id: string) {
    if (!confirm('Deactivate this SKU? It will be hidden from new quotes.')) return
    const res = await fetch(`/api/skus/${id}`, { method: 'DELETE' })
    if (res.ok) setSkus((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SKUs..."
          className="flex-1 min-w-0 text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground placeholder:text-muted-foreground"
        />
        {canEdit && !showAdd && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white" style={{ backgroundColor: '#2D6A4F' }}>
            <Plus size={14} />Add SKU
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">New SKU</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Item # (supplier)</label>
              <input value={form.supplierItemNumber} onChange={(e) => setForm({ ...form, supplierItemNumber: e.target.value })}
                className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Unit of Measure *</label>
              <input value={form.unitOfMeasure} onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })} required placeholder="each, sq ft, lb..."
                className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground placeholder:text-muted-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Base Price *</label>
              <input type="number" step="0.01" min="0" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} required placeholder="0.00"
                className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground placeholder:text-muted-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Margin % Override</label>
              <input type="number" step="0.1" min="0" max="100" value={form.globalMarginPct} onChange={(e) => setForm({ ...form, globalMarginPct: e.target.value })} placeholder="uses global default"
                className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground placeholder:text-muted-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground" />
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-1.5 rounded-md text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#2D6A4F' }}>
              {saving ? 'Saving...' : 'Add SKU'}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setForm({ ...BLANK }); setError(null) }}
              className="px-3 py-1.5 rounded-md text-sm border border-border text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </form>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No SKUs{search ? ' matching your search' : ' yet'}.</p>
      ) : (
        <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
          {filtered.map((sku) => (
            <div key={sku.id} className="p-4 bg-card">
              {editingId === sku.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
                      <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Item #</label>
                      <input value={editForm.supplierItemNumber} onChange={(e) => setEditForm({ ...editForm, supplierItemNumber: e.target.value })}
                        className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Unit *</label>
                      <input value={editForm.unitOfMeasure} onChange={(e) => setEditForm({ ...editForm, unitOfMeasure: e.target.value })}
                        className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Base Price *</label>
                      <input type="number" step="0.01" min="0" value={editForm.basePrice} onChange={(e) => setEditForm({ ...editForm, basePrice: e.target.value })}
                        className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Margin %</label>
                      <input type="number" step="0.1" min="0" max="100" value={editForm.globalMarginPct} onChange={(e) => setEditForm({ ...editForm, globalMarginPct: e.target.value })}
                        className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                      <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(sku.id)} disabled={saving}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#2D6A4F' }}>
                      <Check size={12} />{saving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm border border-border text-muted-foreground hover:text-foreground">
                      <X size={12} />Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">{sku.name}</p>
                      {sku.supplierItemNumber && (
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">#{sku.supplierItemNumber}</span>
                      )}
                    </div>
                    {sku.description && <p className="text-xs text-muted-foreground mt-0.5">{sku.description}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">${Number(sku.basePrice).toFixed(2)} / {sku.unitOfMeasure}</span>
                      {sku.globalMarginPct !== null && <span>{sku.globalMarginPct}% margin</span>}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => startEdit(sku)} className="p-1.5 rounded text-muted-foreground hover:text-foreground"><Pencil size={13} /></button>
                      <button onClick={() => handleDeactivate(sku.id)} className="p-1.5 rounded text-muted-foreground hover:text-destructive"><X size={13} /></button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
