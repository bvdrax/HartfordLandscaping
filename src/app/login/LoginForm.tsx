'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Mode = 'magic-link' | 'password'
type State = 'idle' | 'loading' | 'sent'

export default function LoginForm() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('magic-link')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setState('loading')

    try {
      if (mode === 'password') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const json = await res.json()
        if (!res.ok) {
          setError(json.error ?? 'Invalid email or password.')
          setState('idle')
          return
        }
        router.push(json.data?.redirect ?? '/dashboard')
        return
      }

      // Magic link mode
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong.')
        setState('idle')
        return
      }
      setState('sent')
    } catch {
      setError('Network error. Please try again.')
      setState('idle')
    }
  }

  if (state === 'sent') {
    return (
      <div className="text-center py-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Check your email</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          We sent a login link to <strong>{email}</strong>. It expires in 15 minutes.
        </p>
        <button
          onClick={() => { setState('idle'); setEmail('') }}
          className="mt-4 text-sm underline text-gray-500 hover:text-gray-700"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm font-medium">
        <button
          type="button"
          onClick={() => { setMode('magic-link'); setError(null) }}
          className={`flex-1 py-2 transition-colors ${
            mode === 'magic-link'
              ? 'bg-[#2D6A4F] text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          Email link
        </button>
        <button
          type="button"
          onClick={() => { setMode('password'); setError(null) }}
          className={`flex-1 py-2 transition-colors ${
            mode === 'password'
              ? 'bg-[#2D6A4F] text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          Password
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@hartfordlandscaping.com"
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
          />
        </div>

        {mode === 'password' && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={state === 'loading'}
          className="w-full py-2.5 px-4 rounded-md text-white text-sm font-semibold disabled:opacity-60"
          style={{ backgroundColor: '#2D6A4F' }}
        >
          {state === 'loading'
            ? mode === 'password' ? 'Signing in...' : 'Sending...'
            : mode === 'password' ? 'Sign In' : 'Send Magic Link'}
        </button>

        {mode === 'magic-link' && (
          <p className="text-center text-xs text-gray-400">
            No password needed - we will email you a sign-in link.
          </p>
        )}
        {mode === 'password' && (
          <p className="text-center text-xs text-gray-400">
            No password set? Use the Email link option to sign in, then set one in your account settings.
          </p>
        )}
      </form>
    </div>
  )
}
