'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload, Scan } from 'lucide-react'
import LineItemsTable, { LineItem } from './LineItemsTable'

interface Project {
  id: string
  name: string
}

interface Props {
  projects: Project[]
  defaultProjectId?: string
}

function HeaderFields({ fields, setFields }: {
  fields: { vendor: string; receiptDate: string; totalAmount: string; taxAmount: string; deliveryFee: string; notes: string }
  setFields: (f: typeof fields) => void
}) {
  function set(key: keyof typeof fields, val: string) {
    setFields({ ...fields, [key]: val })
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vendor</label>
        <input value={fields.vendor} onChange={(e) => set('vendor', e.target.value)} placeholder="Store or supplier name"
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</label>
        <input type="date" value={fields.receiptDate} onChange={(e) => set('receiptDate', e.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total ($)</label>
        <input type="number" min="0" step="0.01" value={fields.totalAmount} onChange={(e) => set('totalAmount', e.target.value)} placeholder="0.00"
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tax ($)</label>
        <input type="number" min="0" step="0.01" value={fields.taxAmount} onChange={(e) => set('taxAmount', e.target.value)} placeholder="0.00"
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delivery ($)</label>
        <input type="number" min="0" step="0.01" value={fields.deliveryFee} onChange={(e) => set('deliveryFee', e.target.value)} placeholder="0.00"
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
      <div className="col-span-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</label>
        <textarea value={fields.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Optional"
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
      </div>
    </div>
  )
}

export default function ReceiptForm({ projects, defaultProjectId }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const [projectId, setProjectId] = useState(defaultProjectId ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fields, setFields] = useState({
    vendor: '', receiptDate: '', totalAmount: '', taxAmount: '', deliveryFee: '', notes: '',
  })
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [ocring, setOcring] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleFileChange(f: File | null) {
    if (!f) return
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
  }

  async function handleOcr() {
    if (!file) { setError('Upload an image first'); return }
    setOcring(true)
    setError('')
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/receipts/ocr', { method: 'POST', body: fd })
    const data = await res.json()
    setOcring(false)
    if (!res.ok) { setError(data.error ?? 'OCR failed'); return }

    const d = data.data
    setFields({
      vendor: d.vendor ?? '',
      receiptDate: d.receiptDate ?? '',
      totalAmount: d.totalAmount != null ? String(d.totalAmount) : '',
      taxAmount: d.taxAmount != null ? String(d.taxAmount) : '',
      deliveryFee: d.deliveryFee != null ? String(d.deliveryFee) : '',
      notes: fields.notes,
    })

    if (d.lineItems && d.lineItems.length > 0) {
      setLineItems(d.lineItems.map((li: { description: string; quantity: number; unitCost: number }) => ({
        id: crypto.randomUUID(),
        description: li.description,
        quantity: String(li.quantity ?? 1),
        unitCost: String(li.unitCost ?? 0),
      })))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!projectId) { setError('Select a project'); return }
    setSaving(true)
    setError('')

    const fd = new FormData()
    fd.append('projectId', projectId)
    if (file) fd.append('file', file)
    fd.append('vendor', fields.vendor)
    fd.append('receiptDate', fields.receiptDate)
    fd.append('totalAmount', fields.totalAmount)
    fd.append('taxAmount', fields.taxAmount)
    fd.append('deliveryFee', fields.deliveryFee)
    fd.append('notes', fields.notes)
    fd.append('lineItems', JSON.stringify(lineItems.map((li) => ({
      description: li.description,
      quantity: parseFloat(li.quantity) || 1,
      unitCost: parseFloat(li.unitCost) || 0,
    }))))

    const res = await fetch('/api/receipts', { method: 'POST', body: fd })
    const result = await res.json()
    setSaving(false)
    if (!res.ok) { setError(result.error ?? 'Failed to save receipt'); return }

    router.push('/receipts/' + result.data.id)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Project</label>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} required
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="">Select project...</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Receipt Image</label>

        {previewUrl && (
          <img src={previewUrl} alt="Receipt preview" className="w-full max-h-48 object-contain rounded-lg border border-border" />
        )}

        <div className="flex gap-2">
          <button type="button" onClick={() => cameraRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Camera size={16} />Camera
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Upload size={16} />File
          </button>
          {file && (
            <button type="button" onClick={handleOcr} disabled={ocring}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium disabled:opacity-60 transition-colors">
              <Scan size={16} />{ocring ? 'Scanning...' : 'OCR'}
            </button>
          )}
        </div>

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />

        {file && <p className="text-xs text-muted-foreground">{file.name}</p>}
      </div>

      <HeaderFields fields={fields} setFields={setFields} />

      <LineItemsTable items={lineItems} onChange={setLineItems} taxAmount={fields.taxAmount} deliveryFee={fields.deliveryFee} />

      <button type="submit" disabled={saving}
        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-medium py-3 rounded-md text-sm transition-colors">
        {saving ? 'Saving...' : 'Save Receipt'}
      </button>
    </form>
  )
}
