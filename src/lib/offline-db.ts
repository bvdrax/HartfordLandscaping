/**
 * Thin IndexedDB wrapper for the offline action queue.
 * Stores pending clock-in, clock-out, and upload actions
 * that will be replayed when connectivity is restored.
 */

const DB_NAME = 'hartford-offline'
const DB_VERSION = 1
const STORE = 'queue'

export type QueueAction =
  | { type: 'clock-in'; payload: { projectId: string; location: { lat: number; lng: number } | null; clockInAt: string } }
  | { type: 'clock-out'; payload: { location: { lat: number; lng: number } | null; breakMinutes: number; notes: string | null; clockOutAt: string } }
  | { type: 'photo-upload'; payload: { projectId: string; category: string; caption: string; blob: Blob; fileName: string; mimeType: string } }
  | { type: 'receipt-upload'; payload: { projectId: string; vendor: string; receiptDate: string; totalAmount: string; blob: Blob | null; fileName: string; mimeType: string; lineItemsJson: string } }

export interface QueueItem {
  id: string
  action: QueueAction
  createdAt: number
  retries: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function enqueue(action: QueueAction): Promise<string> {
  const db = await openDb()
  const item: QueueItem = {
    id: crypto.randomUUID(),
    action,
    createdAt: Date.now(),
    retries: 0,
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).add(item)
    tx.oncomplete = () => resolve(item.id)
    tx.onerror = () => reject(tx.error)
  })
}

export async function dequeue(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getAllQueued(): Promise<QueueItem[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as QueueItem[])
    req.onerror = () => reject(req.error)
  })
}

export async function getQueueCount(): Promise<number> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Attempt to replay all queued actions. Returns number successfully synced. */
export async function drainQueue(): Promise<number> {
  const items = await getAllQueued()
  if (items.length === 0) return 0

  let synced = 0
  for (const item of items) {
    try {
      await replayAction(item.action)
      await dequeue(item.id)
      synced++
    } catch {
      // leave in queue for next attempt
    }
  }
  return synced
}

async function replayAction(action: QueueAction): Promise<void> {
  if (action.type === 'clock-in') {
    const res = await fetch('/api/time-logs/clock-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.payload),
    })
    if (!res.ok) throw new Error('clock-in replay failed')

  } else if (action.type === 'clock-out') {
    const res = await fetch('/api/time-logs/clock-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.payload),
    })
    if (!res.ok) throw new Error('clock-out replay failed')

  } else if (action.type === 'photo-upload') {
    const { projectId, category, caption, blob, fileName, mimeType } = action.payload
    const file = new File([blob], fileName, { type: mimeType })
    const fd = new FormData()
    fd.append('file', file)
    fd.append('category', category)
    fd.append('caption', caption)
    const res = await fetch(`/api/projects/${projectId}/photos`, { method: 'POST', body: fd })
    if (!res.ok) throw new Error('photo replay failed')

  } else if (action.type === 'receipt-upload') {
    const { projectId, vendor, receiptDate, totalAmount, blob, fileName, mimeType, lineItemsJson } = action.payload
    const fd = new FormData()
    fd.append('projectId', projectId)
    fd.append('vendor', vendor)
    fd.append('receiptDate', receiptDate)
    fd.append('totalAmount', totalAmount)
    fd.append('lineItems', lineItemsJson)
    if (blob) {
      const file = new File([blob], fileName, { type: mimeType })
      fd.append('file', file)
    }
    const res = await fetch('/api/receipts', { method: 'POST', body: fd })
    if (!res.ok) throw new Error('receipt replay failed')
  }
}
