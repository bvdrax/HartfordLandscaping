'use client'

import { Trash2, Plus } from 'lucide-react'

export interface LineItem {
  id: string
  description: string
  quantity: string
  unitCost: string
  amortizedTax?: number
  amortizedDelivery?: number
}

interface Props {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  taxAmount: string
  deliveryFee: string
}

function newItem(): LineItem {
  return { id: crypto.randomUUID(), description: '', quantity: '1', unitCost: '0' }
}

function fmt(n: number) {
  return '$' + n.toFixed(2)
}

export default function LineItemsTable({ items, onChange, taxAmount, deliveryFee }: Props) {
  function update(id: string, field: keyof LineItem, value: string) {
    onChange(items.map((li) => li.id === id ? { ...li, [field]: value } : li))
  }

  function remove(id: string) {
    onChange(items.filter((li) => li.id !== id))
  }

  function add() {
    onChange([...items, newItem()])
  }

  // Compute amortized tax/delivery for display
  const extended = items.map((li) => (parseFloat(li.quantity) || 0) * (parseFloat(li.unitCost) || 0))
  const totalExtended = extended.reduce((s, v) => s + v, 0)
  const tax = parseFloat(taxAmount) || 0
  const delivery = parseFloat(deliveryFee) || 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Line Items</span>
        <button type="button" onClick={add} className="flex items-center gap-1 text-xs text-primary hover:underline">
          <Plus size={12} />Add Line
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No line items yet. Add one or use OCR.</p>
      )}

      {items.map((li, i) => {
        const ext = (parseFloat(li.quantity) || 0) * (parseFloat(li.unitCost) || 0)
        const ratio = totalExtended > 0 ? ext / totalExtended : 0
        const amTax = Math.round(tax * ratio * 100) / 100
        const amDel = Math.round(delivery * ratio * 100) / 100
        const total = ext + amTax + amDel

        return (
          <div key={li.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}.</span>
              <input
                placeholder="Description"
                value={li.description}
                onChange={(e) => update(li.id, 'description', e.target.value)}
                className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button type="button" onClick={() => remove(li.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2 pl-6">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Qty</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={li.quantity}
                  onChange={(e) => update(li.id, 'quantity', e.target.value)}
                  className="w-full rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Unit Cost</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={li.unitCost}
                  onChange={(e) => update(li.id, 'unitCost', e.target.value)}
                  className="w-full rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="text-right text-xs space-y-0.5 shrink-0">
                <p className="text-muted-foreground">Ext: {fmt(ext)}</p>
                {(tax > 0 || delivery > 0) && (
                  <p className="text-muted-foreground">+Tax/Del: {fmt(amTax + amDel)}</p>
                )}
                <p className="font-semibold text-foreground">Total: {fmt(total)}</p>
              </div>
            </div>
          </div>
        )
      })}

      {items.length > 0 && (
        <div className="text-right text-xs text-muted-foreground pt-1">
          Grand total: <span className="font-semibold text-foreground">{fmt(
            items.reduce((sum, li) => {
              const ext = (parseFloat(li.quantity) || 0) * (parseFloat(li.unitCost) || 0)
              const ratio = totalExtended > 0 ? ext / totalExtended : 0
              return sum + ext + Math.round(tax * ratio * 100) / 100 + Math.round(delivery * ratio * 100) / 100
            }, 0)
          )}</span>
        </div>
      )}
    </div>
  )
}
