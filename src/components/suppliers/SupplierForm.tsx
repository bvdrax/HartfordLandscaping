'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SupplierData {
  id: string
  name: string
  accountNumber: string | null
  repName: string | null
  repPhone: string | null
  repEmail: string | null
  notes: string | null
}

interface SupplierFormProps {
  supplier?: SupplierData
}

export default function SupplierForm({ supplier }: SupplierFormProps) {
  const router = useRouter()
  const [name, setName] = useState(supplier?.name ?? '')
  const [accountNumber, setAccountNumber] = useState(supplier?.accountNumber ?? '')
  const [repName, setRepName] = useState(supplier?.repName ?? '')
  const [repPhone, setRepPhone] = useState(supplier?.repPhone ?? '')
  const [repEmail, setRepEmail] = useState(supplier?.repEmail ?? '')
  const [notes, setNotes] = useState(supplier?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const body = { name, accountNumber, repName, repPhone, repEmail, notes }
    const res = await fetch(
      supplier ? `/api/suppliers/${supplier.id}` : '/api/suppliers',
      { method: supplier ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    )
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Save failed'); return }
    router.push(`/suppliers/${json.data.supplier.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Supplier Name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. SiteOne Landscape Supply"
          className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground" />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Account Number</label>
        <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Your account # with this supplier"
          className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Rep Name</label>
          <input value={repName} onChange={(e) => setRepName(e.target.value)} placeholder="Sales rep"
            className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Rep Phone</label>
          <input value={repPhone} onChange={(e) => setRepPhone(e.target.value)} placeholder="(555) 000-0000"
            className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Rep Email</label>
          <input type="email" value={repEmail} onChange={(e) => setRepEmail(e.target.value)} placeholder="rep@supplier.com"
            className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground" />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Delivery minimums, lead times, etc."
          className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground resize-none" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="px-5 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: '#2D6A4F' }}>
          {loading ? 'Saving…' : supplier ? 'Save Changes' : 'Create Supplier'}
        </button>
        <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-md text-sm border border-border text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
    </form>
  )
}
