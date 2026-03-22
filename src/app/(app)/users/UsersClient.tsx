'use client'

import { useState } from 'react'
import UserCreateModal from './UserCreateModal'
import UserEditModal from './UserEditModal'

const ROLE_LABELS: Record<string, string> = {
  PLATFORM_ADMIN: 'Platform Admin',
  OWNER: 'Owner',
  ACCOUNTANT: 'Accountant',
  PROJECT_MANAGER: 'Project Manager',
  FIELD_WORKER: 'Field Worker',
  SUBCONTRACTOR: 'Subcontractor',
}

const ROLE_COLORS: Record<string, string> = {
  PLATFORM_ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  OWNER: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  ACCOUNTANT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  PROJECT_MANAGER: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  FIELD_WORKER: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  SUBCONTRACTOR: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
}

export interface UserRow {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  role: string
  isActive: boolean
  hasPassword: boolean
  createdAt: string
}

interface Props {
  users: UserRow[]
  currentUserId: string
}

export default function UsersClient({ users: initial, currentUserId }: Props) {
  const [users, setUsers] = useState<UserRow[]>(initial)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function upsertUser(updated: UserRow) {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === updated.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = updated
        return next
      }
      return [updated, ...prev]
    })
  }

  async function sendInvite(user: UserRow) {
    const res = await fetch(`/api/users/${user.id}/invite`, { method: 'POST' })
    const json = await res.json()
    showToast(res.ok ? `Invite sent to ${user.email}` : (json.error ?? 'Failed to send invite'))
  }

  async function toggleActive(user: UserRow) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    })
    const json = await res.json()
    if (res.ok) {
      upsertUser(json.data)
      showToast(json.data.isActive ? 'User activated' : 'User deactivated')
    } else {
      showToast(json.error ?? 'Failed to update user')
    }
  }

  async function clearPassword(user: UserRow) {
    if (!confirm(`Remove password for ${user.firstName} ${user.lastName}? They will need to sign in via magic link.`)) return
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
    const json = await res.json()
    if (res.ok) {
      upsertUser({ ...user, hasPassword: false })
      showToast('Password cleared')
    } else {
      showToast(json.error ?? 'Failed to clear password')
    }
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const activeCount = users.filter((u) => u.isActive).length

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {activeCount} active of {users.length} total
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-md text-white text-sm font-semibold"
          style={{ backgroundColor: '#2D6A4F' }}
        >
          + New User
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
        >
          <option value="ALL">All Roles</option>
          {Object.entries(ROLE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No users found</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((user) => (
              <div
                key={user.id}
                className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 ${!user.isActive ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                    style={{ backgroundColor: '#2D6A4F' }}>
                    {user.firstName[0]}{user.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900 dark:text-white">
                        {user.firstName} {user.lastName}
                        {user.id === currentUserId && (
                          <span className="ml-1 text-xs text-gray-400">(you)</span>
                        )}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role] ?? ''}`}>
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                      {!user.isActive && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pl-12 sm:pl-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${user.hasPassword ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {user.hasPassword ? 'Password set' : 'Magic link only'}
                  </span>
                  <button
                    onClick={() => setEditing(user)}
                    className="text-xs px-2.5 py-1 rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => sendInvite(user)}
                    disabled={!user.isActive}
                    className="text-xs px-2.5 py-1 rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-40"
                  >
                    Send invite
                  </button>
                  {user.hasPassword && (
                    <button
                      onClick={() => clearPassword(user)}
                      className="text-xs px-2.5 py-1 rounded border border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600 dark:text-orange-400"
                    >
                      Clear password
                    </button>
                  )}
                  {user.id !== currentUserId && (
                    <button
                      onClick={() => toggleActive(user)}
                      className={`text-xs px-2.5 py-1 rounded border ${
                        user.isActive
                          ? 'border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
                          : 'border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400'
                      }`}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <UserCreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(u) => { upsertUser(u); setShowCreate(false); showToast('User created') }}
        />
      )}

      {editing && (
        <UserEditModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={(u) => { upsertUser(u); setEditing(null); showToast('User updated') }}
        />
      )}
    </div>
  )
}
