'use client'

import { useState } from 'react'

interface Props {
  name: string
  email: string
  hasPassword: boolean
}

export default function AccountClient({ name, email, hasPassword: initialHasPassword }: Props) {
  const [hasPassword, setHasPassword] = useState(initialHasPassword)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (password !== confirm) { setMessage({ text: 'Passwords do not match', ok: false }); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const json = await res.json()
      if (res.ok) {
        setMessage({ text: 'Password set successfully', ok: true })
        setHasPassword(true)
        setPassword('')
        setConfirm('')
      } else {
        setMessage({ text: json.error ?? 'Failed to set password', ok: false })
      }
    } catch {
      setMessage({ text: 'Network error', ok: false })
    } finally {
      setLoading(false)
    }
  }

  async function handleRemovePassword() {
    if (!confirm(`Remove your password? You will need to use a magic link to sign in.`)) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/set-password', { method: 'DELETE' })
      const json = await res.json()
      if (res.ok) {
        setMessage({ text: 'Password removed', ok: true })
        setHasPassword(false)
      } else {
        setMessage({ text: json.error ?? 'Failed to remove password', ok: false })
      }
    } catch {
      setMessage({ text: 'Network error', ok: false })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Account</h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Profile</h2>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
          <p className="text-sm text-gray-900 dark:text-white">{name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
          <p className="text-sm text-gray-900 dark:text-white">{email}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Password</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full ${hasPassword ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
            {hasPassword ? 'Set' : 'Not set'}
          </span>
        </div>

        {message && (
          <p className={`text-sm ${message.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {message.text}
          </p>
        )}

        <form onSubmit={handleSetPassword} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {hasPassword ? 'New password' : 'Set a password'}
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-md text-white text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: '#2D6A4F' }}
          >
            {loading ? 'Saving...' : hasPassword ? 'Update Password' : 'Set Password'}
          </button>
        </form>

        {hasPassword && (
          <button
            onClick={handleRemovePassword}
            disabled={loading}
            className="w-full py-2 rounded-md border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40"
          >
            Remove password
          </button>
        )}

        <p className="text-xs text-gray-400">
          {hasPassword
            ? 'You can sign in with your password or a magic link.'
            : 'Setting a password lets you sign in without waiting for an email link.'}
        </p>
      </div>
    </div>
  )
}
