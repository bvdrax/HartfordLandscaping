import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken, SESSION_COOKIE, SessionPayload } from './auth'
import { Role } from '@prisma/client'

export class ApiError extends Error {
  constructor(
    public message: string,
    public status: number
  ) {
    super(message)
  }
}

// Use in API route handlers to get the verified session
export function requireSession(request: NextRequest): SessionPayload {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) throw new ApiError('Unauthorized', 401)
  try {
    return verifySessionToken(token)
  } catch {
    throw new ApiError('Unauthorized', 401)
  }
}

// Use after requireSession to enforce role-based access
export function requireRole(session: SessionPayload, allowedRoles: Role[]) {
  if (!allowedRoles.includes(session.role as Role)) {
    throw new ApiError('Forbidden', 403)
  }
}

// Convenience: wrap an API handler with automatic error handling
export function withAuth(
  handler: (req: NextRequest, session: SessionPayload) => Promise<Response>,
  allowedRoles?: Role[]
) {
  return async (req: NextRequest) => {
    try {
      const session = requireSession(req)
      if (allowedRoles) requireRole(session, allowedRoles)
      return await handler(req, session)
    } catch (e) {
      if (e instanceof ApiError) {
        return NextResponse.json(
          { data: null, error: e.message, meta: null },
          { status: e.status }
        )
      }
      console.error(e)
      return NextResponse.json(
        { data: null, error: 'Internal server error', meta: null },
        { status: 500 }
      )
    }
  }
}
