'use client'

import { useState } from 'react'

interface SettingsData {
  defaultMarginPct: number
  defaultTaxRate: number
  companyName: string
  companyPhone: string | null
  companyEmail: string | null
  companyAddress: string | null
}

export default function SettingsForm({ settings }: { settings: SettingsData }) {
  const [form, setForm] = useState({
    defaultMarginPct: String(settings.defaultMarginPct),
    defaultTaxRate: String(Number(settings.defaultTaxRate) * 100), // store as decimal, show as %
    companyName: settings.companyName,
    companyPhone: settings.companyPhone ?? '',
    companyEmail: settings.companyEmail ?? '',
    companyAddress: settings.companyAddress ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        defaultMarginPct: parseFloat(form.defaultMarginPct),
        defaultTaxRate: parseFloat(form.defaultTaxRate) / 100, // convert % back to decimal
        companyName: form.companyName,
        companyPhone: form.companyPhone,
        companyEmail: form.companyEmail,
        companyAddress: form.companyAddress,
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(json.error ?? 'Save failed'); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">Pricing Defaults</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Default Margin %</label>
            <div className="relative">
              <input
                type="number" step="0.1" min="0" max="100"
                value={form.defaultMarginPct}
                onChange={(e) => setForm({ ...form, defaultMarginPct: e.target.value })}
                className="w-full text-sm border border-border rounded-md px-3 py-2 pr-8 bg-background text-foreground"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Applied to all SKUs unless overridden</p>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Default Tax Rate %</label>
            <div className="relative">
              <input
                type="number" step="0.001" min="0" max="100"
                value={form.defaultTaxRate}
                onChange={(e) => setForm({ ...form, defaultTaxRate: e.target.value })}
                className="w-full text-sm border border-border rounded-md px-3 py-2 pr-8 bg-background text-foreground"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">e.g. 8.75 for 8.75% sales tax</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">Company Info</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Company Name</label>
            <input
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Phone</label>
              <input
                value={form.companyPhone}
                onChange={(e) => setForm({ ...form, companyPhone: e.target.value })}
                placeholder="(555) 000-0000"
                className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
              <input
                type="email"
                value={form.companyEmail}
                onChange={(e) => setForm({ ...form, companyEmail: e.target.value })}
                placeholder="billing@company.com"
                className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Address</label>
            <input
              value={form.companyAddress}
              onChange={(e) => setForm({ ...form, companyAddress: e.target.value })}
              placeholder="123 Main St, Hartford, CT 06101"
              className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-green-600 dark:text-green-400">Settings saved.</p>}

      <button type="submit" disabled={saving} className="px-5 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: '#2D6A4F' }}>
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </form>
  )
}
