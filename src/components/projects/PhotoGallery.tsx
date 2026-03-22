'use client'

import { useState, useRef, useCallback } from 'react'
import { Trash2, ZoomIn, Upload, X, WifiOff } from 'lucide-react'
import { enqueue } from '@/lib/offline-db'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

const CATEGORY_LABELS: Record<string, string> = {
  ALL: 'All', BEFORE: 'Before', PROPOSED_MOCKUP: 'Proposed',
  IN_PROGRESS: 'In Progress', AFTER: 'After', RECEIPT: 'Receipts',
}

const TABS = ['ALL', 'BEFORE', 'PROPOSED_MOCKUP', 'IN_PROGRESS', 'AFTER', 'RECEIPT']

const UPLOAD_CATEGORIES = [
  { value: 'BEFORE', label: 'Before' },
  { value: 'PROPOSED_MOCKUP', label: 'Proposed / Mockup' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'AFTER', label: 'After' },
  { value: 'RECEIPT', label: 'Receipt' },
]

interface Photo {
  id: string
  storageUrl: string
  thumbnailUrl: string | null
  category: string
  caption: string | null
  areaTag: string | null
  uploadedAt: string
  uploadedBy: { firstName: string; lastName: string }
}

interface PhotoGalleryProps {
  projectId: string
  initialPhotos: Photo[]
  canDelete: boolean
}

export default function PhotoGallery({ projectId, initialPhotos, canDelete }: PhotoGalleryProps) {
  const online = useOnlineStatus()
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [activeTab, setActiveTab] = useState('ALL')
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [category, setCategory] = useState('BEFORE')
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchPhotos = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/photos`)
    if (res.ok) {
      const json = await res.json()
      setPhotos(json.data.photos)
    }
  }, [projectId])

  const filtered = activeTab === 'ALL' ? photos : photos.filter((p) => p.category === activeTab)

  function resetUpload() {
    setFile(null)
    setCaption('')
    setCategory('BEFORE')
    setUploadError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleDelete(photo: Photo) {
    if (!confirm('Delete this photo? This cannot be undone.')) return
    setDeleting(photo.id)
    const res = await fetch(`/api/projects/${projectId}/photos/${photo.id}`, { method: 'DELETE' })
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
      if (lightbox?.id === photo.id) setLightbox(null)
    }
    setDeleting(null)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setUploadError('Please select a file'); return }
    setUploading(true)
    setUploadError(null)

    if (!online) {
      const blob = new Blob([await file.arrayBuffer()], { type: file.type })
      await enqueue({
        type: 'photo-upload',
        payload: { projectId, category, caption: caption.trim() || '', blob, fileName: file.name, mimeType: file.type },
      })
      setUploading(false)
      resetUpload()
      setUploadOpen(false)
      setQueuedMessage('Photo queued — will upload when back online')
      setTimeout(() => setQueuedMessage(null), 5000)
      return
    }

    const fd = new FormData()
    fd.append('file', file)
    fd.append('category', category)
    if (caption.trim()) fd.append('caption', caption.trim())
    const res = await fetch(`/api/projects/${projectId}/photos`, { method: 'POST', body: fd })
    const json = await res.json()
    setUploading(false)
    if (!res.ok) { setUploadError(json.error ?? 'Upload failed'); return }
    resetUpload()
    setUploadOpen(false)
    fetchPhotos()
  }

  return (
    <div className="space-y-4">
      {queuedMessage && (
        <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          <WifiOff size={14} className="shrink-0" />
          {queuedMessage}
        </div>
      )}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {TABS.map((tab) => {
            const count = tab === 'ALL' ? photos.length : photos.filter((p) => p.category === tab).length
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {CATEGORY_LABELS[tab]}{count > 0 ? ` (${count})` : ''}
              </button>
            )
          })}
        </div>
        {!uploadOpen && (
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {online ? <Upload size={14} /> : <WifiOff size={14} />}
            {online ? 'Upload Photo' : 'Queue Photo'}
          </button>
        )}
      </div>

      {uploadOpen && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Upload Photo</h3>
            <button onClick={() => { setUploadOpen(false); resetUpload() }} className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleUpload} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground"
              >
                {UPLOAD_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Photo</label>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Caption (optional)</label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Brief description..."
                className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>
            {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={uploading || !file}
                className="flex-1 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: '#2D6A4F' }}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button
                type="button"
                onClick={() => { setUploadOpen(false); resetUpload() }}
                className="px-4 py-2 rounded-md text-sm border border-border text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No photos in this category yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((photo) => (
            <div key={photo.id} className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.thumbnailUrl ?? photo.storageUrl} alt={photo.caption ?? photo.category} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button onClick={() => setLightbox(photo)} className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white">
                  <ZoomIn size={14} />
                </button>
                {canDelete && (
                  <button onClick={() => handleDelete(photo)} disabled={deleting === photo.id} className="p-1.5 rounded-full bg-white/20 hover:bg-destructive/80 text-white disabled:opacity-50">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/50 text-white text-[10px] truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {photo.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="max-w-4xl w-full max-h-full flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.storageUrl} alt={lightbox.caption ?? lightbox.category} className="max-h-[75vh] w-auto rounded-lg object-contain" />
            <div className="text-center text-white text-sm space-y-0.5">
              <p className="font-medium">{CATEGORY_LABELS[lightbox.category] ?? lightbox.category}</p>
              {lightbox.caption && <p className="text-white/70 text-xs">{lightbox.caption}</p>}
              <p className="text-white/50 text-xs">
                {lightbox.uploadedBy.firstName} {lightbox.uploadedBy.lastName}
                {' · '}{new Date(lightbox.uploadedAt).toLocaleDateString()}
              </p>
            </div>
            <button onClick={() => setLightbox(null)} className="mt-1 text-white/60 hover:text-white text-xs">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
