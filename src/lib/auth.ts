import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'hartford-session'

function getMagicLinkSecret(): string {
  const s = process.env.MAGIC_LINK_SECRET
  if (!s) throw new Error('MAGIC_LINK_SECRET is not set')
  return s
}

function getSessionSecret(): string {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET is not set')
  return s
}

export interface SessionPayload {
  userId: string
  email: string
  role: string
  firstName: string
  lastName: string
}

// ── Portal Token ──────────────────────────────────────────────────────────────

export function signPortalToken(customerId: string, projectId: string): string {
  return jwt.sign({ customerId, projectId, type: 'portal' }, getMagicLinkSecret(), {
    expiresIn: '72h',
    algorithm: 'HS256',
  })
}

export function verifyPortalToken(token: string): { customerId: string; projectId: string } {
  const payload = jwt.verify(token, getMagicLinkSecret()) as { customerId: string; projectId: string; type: string }
  if (payload.type !== 'portal') throw new Error('Invalid token type')
  return { customerId: payload.customerId, projectId: payload.projectId }
}

// ── Magic Link ────────────────────────────────────────────────────────────────

export function signMagicLinkToken(userId: string, email: string): string {
  return jwt.sign({ userId, email, type: 'magic-link' }, getMagicLinkSecret(), {
    expiresIn: '15m',
    algorithm: 'HS256',
  })
}

export function verifyMagicLinkToken(token: string): { userId: string; email: string } {
  const payload = jwt.verify(token, getMagicLinkSecret()) as { userId: string; email: string; type: string }
  if (payload.type !== 'magic-link') throw new Error('Invalid token type')
  return { userId: payload.userId, email: payload.email }
}

// ── Session ───────────────────────────────────────────────────────────────────

export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, getSessionSecret(), { expiresIn: '24h', algorithm: 'HS256' })
}

export function verifySessionToken(token: string): SessionPayload {
  return jwt.verify(token, getSessionSecret()) as SessionPayload
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    return verifySessionToken(token)
  } catch {
    return null
  }
}

export function buildSessionCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  const maxAge = 60 * 60 * 24 // 24 hours
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/${secure}; Max-Age=${maxAge}`
}

export function buildClearCookieHeader(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
}
