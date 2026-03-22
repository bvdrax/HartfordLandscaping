'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { MapPin, Calendar, CheckCircle, FileText, LayoutGrid, Loader2 } from 'lucide-react'

interface SiteAddress { street?: string; city?: string; state?: string; zip?: string }
interface LineItem { id: string; description: string; quantity: number; unitPrice: number; laborPricePerUnit: number; lineTotal: number }
interface Quote {
  id: string; versionNumber: number; status: string; total: number
  materialsTotal: number; laborTotal: number; taxTotal: number
  notes: string | null; termsAndConditions: string | null
  expiresAt: string | null; approvedAt: string | null
  lineItems: LineItem[]
}
interface Invoice { id: string; invoiceNumber: string | null; status: string; type: string; amountDue: number; amountPaid: number; total: number; dueDate: string | null }
interface Photo { id: string; storageUrl: string; thumbnailUrl: string | null; category: string; caption: string | null }
interface PortalData {
  customer: { id: string; firstName: string; lastName: string }
  project: {
    id: string; name: string; status: string; siteAddress: SiteAddress | null
    startDate: string | null; estimatedEndDate: string | null
    photos: Photo[]; activeQuote: Quote | null; invoices: Invoice[]
  }
}

const STATUS_LABELS: Record<string, string> = {
  LEAD: 'Lead', QUOTED: 'Quoted', APPROVED: 'Approved', SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress', PUNCH_LIST: 'Punch List', COMPLETE: 'Complete',
  INVOICED: 'Invoiced', PAID: 'Paid', ARCHIVED: 'Archived',
}

function fmt(n: number) { return '$' + Number(n).toFixed(2) }

function QuoteSection({ quote, token, approved, setApproved }: { quote: Quote; token: string; approved: boolean; setApproved: (v: boolean) => void }) {
  const [approving, setApproving] = useState(false)
  const [approveError, setApproveError] = useState<string | null>(null)

  async function handleApprove() {
    if (!confirm('Are you sure you want to approve this quote?')) return
    setApproving(true)
    setApproveError(null)
    const res = await fetch('/api/quotes/' + quote.id + '/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const json = await res.json()
    setApproving(false)
    if (!res.ok) { setApproveError(json.error ?? 'Failed to approve quote'); return }
    setApproved(true)
  }

  function quoteStatusClass() {
    if (quote.status === 'APPROVED') return 'text-[11px] font-medium px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    if (quote.status === 'REJECTED') return 'text-[11px] font-medium px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    return 'text-[11px] font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  }

  function approvedMessage() {
    if (approved && quote.status === 'SENT') return 'Quote approved. We will be in touch to confirm scheduling.'
    if (quote.approvedAt) return 'You approved this quote on ' + new Date(quote.approvedAt).toLocaleDateString() + '.'
    return 'You approved this quote.'
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
        <FileText size={16} className="text-muted-foreground" />
        Your Quote
      </h2>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">v{quote.versionNumber}</span>
            <span className={quoteStatusClass()}>
              {quote.status === 'APPROVED' ? 'Approved' : quote.status === 'REJECTED' ? 'Rejected' : 'Awaiting Approval'}
            </span>
          </div>
          <span className="text-base font-bold text-foreground">{fmt(quote.total)}</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Description</th>
              <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-16">Qty</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground w-24">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {quote.lineItems.map((li) => (
              <tr key={li.id}>
                <td className="px-4 py-2.5 text-foreground">{li.description}</td>
                <td className="px-3 py-2.5 text-right text-muted-foreground">{li.quantity}</td>
                <td className="px-4 py-2.5 text-right font-medium text-foreground">{fmt(li.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-border space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Materials</span><span>{fmt(quote.materialsTotal)}</span>
          </div>
          {quote.laborTotal > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Labor</span><span>{fmt(quote.laborTotal)}</span>
            </div>
          )}
          {quote.taxTotal > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span><span>{fmt(quote.taxTotal)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5 mt-1">
            <span>Total</span><span>{fmt(quote.total)}</span>
          </div>
        </div>
        {quote.expiresAt && quote.status === 'SENT' && (
          <p className="px-4 pb-3 text-xs text-muted-foreground">
            Expires {new Date(quote.expiresAt).toLocaleDateString()}
          </p>
        )}
        {quote.notes && (
          <div className="px-4 pb-3 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Notes</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}
        {quote.termsAndConditions && (
          <div className="px-4 pb-3 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Terms and Conditions</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.termsAndConditions}</p>
          </div>
        )}
      </div>
      {quote.status === 'SENT' && !approved && (
        <div className="mt-4 space-y-2">
          <button
            onClick={handleApprove}
            disabled={approving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: '#2D6A4F' }}
          >
            <CheckCircle size={16} />{approving ? 'Approving...' : 'Approve This Quote'}
          </button>
          {approveError && <p className="text-xs text-destructive">{approveError}</p>}
          <p className="text-xs text-muted-foreground">By approving, you authorize Hartford Landscaping to proceed with this scope of work.</p>
        </div>
      )}
      {(approved || quote.status === 'APPROVED') && (
        <div className="flex items-center gap-2 mt-3 text-sm text-green-700 dark:text-green-400">
          <CheckCircle size={16} />
          <span>{approvedMessage()}</span>
        </div>
      )}
    </section>
  )
}

function PhotosSection({ photos }: { photos: Photo[] }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
        <LayoutGrid size={16} className="text-muted-foreground" />
        Project Photos
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((p) => (
          <a key={p.id} href={p.storageUrl} target="_blank" rel="noopener noreferrer"
            className="block rounded-lg overflow-hidden border border-border bg-muted aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.thumbnailUrl ?? p.storageUrl}
              alt={p.caption ?? p.category}
              className="w-full h-full object-cover hover:opacity-90 transition-opacity"
            />
          </a>
        ))}
      </div>
    </section>
  )
}

function InvoicesSection({ invoices }: { invoices: Invoice[] }) {
  function statusClass(status: string) {
    if (status === 'PAID') return 'text-[11px] font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    if (status === 'PARTIAL') return 'text-[11px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    return 'text-[11px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  }

  function statusLabel(inv: Invoice) {
    if (inv.status === 'PAID') return 'Paid'
    if (inv.status === 'PARTIAL') return 'Partial (' + fmt(inv.amountPaid) + ' paid)'
    return 'Unpaid'
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-3">Invoices</h2>
      <div className="space-y-2">
        {invoices.map((inv) => (
          <div key={inv.id} className="bg-card border border-border rounded-lg px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {inv.invoiceNumber ?? 'Invoice'}
                  <span className="ml-2 text-xs text-muted-foreground capitalize">{inv.type.toLowerCase()}</span>
                </p>
                {inv.dueDate && (
                  <p className="text-xs text-muted-foreground mt-0.5">Due {new Date(inv.dueDate).toLocaleDateString()}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{fmt(inv.total)}</p>
                <span className={statusClass(inv.status)}>{statusLabel(inv)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function PortalPage() {
  const params = useParams()
  const token = decodeURIComponent(params.token as string)

  const [data, setData] = useState<PortalData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [approved, setApproved] = useState(false)

  useEffect(() => {
    fetch('/api/portal/' + encodeURIComponent(token))
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setData(json.data)
          if (json.data.project.activeQuote?.status === 'APPROVED') setApproved(true)
        } else {
          setError(json.error ?? 'Failed to load portal')
        }
      })
      .catch(() => setError('Failed to load portal'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <FileText size={28} className="text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Portal Link Invalid</h1>
          <p className="text-sm text-muted-foreground">{error ?? 'This link is invalid or has expired. Please contact your project manager for a new link.'}</p>
        </div>
      </div>
    )
  }

  const { customer, project } = data
  const addr = project.siteAddress ?? {}

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Hartford Landscaping</p>
            <h1 className="text-lg font-bold text-foreground mt-0.5">{project.name}</h1>
          </div>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-medium">
            {STATUS_LABELS[project.status] ?? project.status}
          </span>
        </div>
      </div>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <p className="text-sm text-muted-foreground">
          Hi {customer.firstName}, here is your project portal. You can view project details, review your quote, and track invoices.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(addr.street || addr.city) && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MapPin size={14} />
                <span className="text-xs font-medium uppercase tracking-wide">Site Address</span>
              </div>
              <div className="text-sm text-foreground">
                {addr.street && <p>{addr.street}</p>}
                {(addr.city || addr.state || addr.zip) && (
                  <p>{[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}</p>
                )}
              </div>
            </div>
          )}
          {(project.startDate || project.estimatedEndDate) && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Calendar size={14} />
                <span className="text-xs font-medium uppercase tracking-wide">Timeline</span>
              </div>
              <div className="text-sm text-foreground space-y-0.5">
                {project.startDate && <p>Start: {new Date(project.startDate).toLocaleDateString()}</p>}
                {project.estimatedEndDate && <p>Est. End: {new Date(project.estimatedEndDate).toLocaleDateString()}</p>}
              </div>
            </div>
          )}
        </div>
        {project.activeQuote && (
          <QuoteSection quote={project.activeQuote} token={token} approved={approved} setApproved={setApproved} />
        )}
        {project.photos.length > 0 && <PhotosSection photos={project.photos} />}
        {project.invoices.length > 0 && <InvoicesSection invoices={project.invoices} />}
        <p className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
          Hartford Landscaping - Questions? Contact your project manager.
        </p>
      </div>
    </div>
  )
}
