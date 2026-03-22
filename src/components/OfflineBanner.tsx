'use client'

import { useEffect, useState } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { drainQueue, getQueueCount } from '@/lib/offline-db'
import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflineBanner() {
  const online = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncedCount, setSyncedCount] = useState<number | null>(null)

  // Check queue count periodically
  useEffect(() => {
    async function check() {
      try {
        const count = await getQueueCount()
        setPendingCount(count)
      } catch { /* IndexedDB not available */ }
    }
    check()
    const id = setInterval(check, 10000)
    return () => clearInterval(id)
  }, [online])

  // Auto-drain when back online
  useEffect(() => {
    if (!online) return
    async function drain() {
      const count = await getQueueCount()
      if (count === 0) return
      setSyncing(true)
      try {
        const synced = await drainQueue()
        if (synced > 0) {
          setSyncedCount(synced)
          setPendingCount(await getQueueCount())
          setTimeout(() => setSyncedCount(null), 4000)
        }
      } catch { /* ignore */ } finally {
        setSyncing(false)
      }
    }
    drain()
  }, [online])

  async function handleManualSync() {
    setSyncing(true)
    try {
      const synced = await drainQueue()
      setSyncedCount(synced)
      setPendingCount(await getQueueCount())
      setTimeout(() => setSyncedCount(null), 4000)
    } catch { /* ignore */ } finally {
      setSyncing(false)
    }
  }

  if (online && pendingCount === 0 && syncedCount === null) return null

  if (online && syncedCount !== null) {
    return (
      <div className="bg-green-600 text-white px-4 py-2 flex items-center gap-2 text-sm">
        <RefreshCw size={14} className="shrink-0" />
        <span>{syncedCount} item{syncedCount !== 1 ? 's' : ''} synced successfully</span>
      </div>
    )
  }

  if (online && pendingCount > 0) {
    return (
      <div className="bg-amber-500 text-white px-4 py-2 flex items-center gap-2 text-sm">
        <RefreshCw size={14} className={`shrink-0 ${syncing ? 'animate-spin' : ''}`} />
        <span className="flex-1">{pendingCount} item{pendingCount !== 1 ? 's' : ''} pending upload</span>
        <button onClick={handleManualSync} disabled={syncing}
          className="shrink-0 text-white/80 hover:text-white font-medium disabled:opacity-60">
          {syncing ? 'Syncing...' : 'Sync now'}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 text-white px-4 py-2 flex items-center gap-2 text-sm">
      <WifiOff size={14} className="shrink-0" />
      <span className="flex-1">You are offline. Actions will be saved and synced when reconnected.</span>
      {pendingCount > 0 && (
        <span className="shrink-0 text-white/70 text-xs">{pendingCount} pending</span>
      )}
    </div>
  )
}
