'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LineItemsTable, { LineItem } from './LineItemsTable'

interface Project { id: string; name: string }
interface User { id: string; firstName: string; lastName: string }

interface InitialData {
  id: string
  vendor: string | null
  receiptDate: string | null
  totalAmount: string
  taxAmount: string
  deliveryFee: string
  notes: string | null
  expenseType: string
  purchasedByUserId: string | null
  lineItems: LineItem[]
}

interface Props {
  receipt: InitialData
  projects: Project[]
  users: User[]
}

export default function ReceiptEditForm({ receipt, projects, users }: Props) {
  const router = useRouter()

  const [vendor, setVendor] = useState(receipt.vendor ?? '')
  const [receiptDate, setReceiptDate] = useState(receipt.receiptDate ?? '')
  const [totalAmount, setTotalAmount] = useState(receipt.totalAmount)
  const [taxAmount, setTaxAmount] = useState(receipt.taxAmount)
  const [deliveryFee, setDeliveryFee] = useState(receipt.deliveryFee)
  const [notes, setNotes] = useState(receipt.notes ?? '')
  const [expenseType, setExpenseType] = useState(receipt.expenseType)
  const [purchasedByUserId, setPurchasedByUserId] = useState(receipt.purchasedByUserId ?? '')
  const [lineItems, setLineItems] = useState<LineItem[]>(receipt.lineItems)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch(`/api/receipts/${receipt.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendor: vendor || null,
        receiptDate: receiptDate || null,
        totalAmount: totalAmount ? parseFloat(totalAmount) : null,
        taxAmount: taxAmount ? parseFloat(taxAmount) : null,
        deliveryFee: deliveryFee ? parseFloat(deliveryFee) : null,
        notes: notes || null,
        expenseType,
        purchasedByUserId: purchasedByUserId || null,
        lineItems: lineItems.map((li) => ({
          description: li.description,
          quantity: parseFloat(li.quantity) || 1,
          unitCost: parseFloat(li.unitCost) || 0,
          projectId: li.projectId ?? null,
          expenseType: li.expenseType ?? null,
        })),
      }),
    })

    const result = await res.json()
    setSaving(false)
    if (!res.ok) { setError(result.error ?? 'Failed to save'); return }

    router.push(`/receipts/${receipt.id}`)
    router.refresh()
  }

  const inputCls = 'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vendor</label>
          <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Store or supplier name" className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</label>
          <input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total ($)</label>
          <input type="number" min="0" step="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="0.00" className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tax ($)</label>
          <input type="number" min="0" step="0.01" value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} placeholder="0.00" className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delivery ($)</label>
          <input type="number" min="0" step="0.01" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} placeholder="0.00" className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expense Type</label>
          <select value={expenseType} onChange={(e) => setExpenseType(e.target.value)} className={inputCls}>
            <option value="BUSINESS">Business</option>
            <option value="PERSONAL">Personal</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Purchased By</label>
          <select value={purchasedByUserId} onChange={(e) => setPurchasedByUserId(e.target.value)} className={inputCls}>
            <option value="">Not specified</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
        </div>
      </div>

      <LineItemsTable
        items={lineItems}
        onChange={setLineItems}
        taxAmount={taxAmount}
        deliveryFee={deliveryFee}
        projects={projects}
      />

      <button type="submit" disabled={saving}
        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-medium py-3 rounded-md text-sm transition-colors">
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}
