import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import LoginForm from './LoginForm'

interface Props {
  searchParams: { from?: string; error?: string }
}

const errorMessages: Record<string, string> = {
  missing_token: 'Invalid login link.',
  invalid_token: 'That login link is no longer valid.',
  expired_token: 'That login link has expired. Please request a new one.',
}

export default async function LoginPage({ searchParams }: Props) {
  const session = await getSession()
  if (session) redirect('/dashboard')

  const devMode = process.env.DEV_PASSWORD_AUTH === 'true'
  const error = searchParams.error ? (errorMessages[searchParams.error] ?? 'Something went wrong.') : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hartford Landscaping</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Business Management</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
          <LoginForm devMode={devMode} />
        </div>
        {devMode && (
          <p className="text-center text-xs text-amber-600 mt-4">Dev mode active</p>
        )}
      </div>
    </div>
  )
}
