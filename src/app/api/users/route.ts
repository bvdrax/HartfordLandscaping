import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { ok, err, serverError } from '@/lib/api'
import { Role } from '@prisma/client'

const ADMIN_ROLES = [Role.PLATFORM_ADMIN, Role.OWNER]

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request)
    requireRole(session, ADMIN_ROLES)

    const users = await prisma.user.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        passwordHash: true, // expose only as boolean indicator
        createdAt: true,
        updatedAt: true,
      },
    })

    // Replace passwordHash with a boolean so we never send the hash to the client
    const sanitized = users.map(({ passwordHash, ...u }) => ({
      ...u,
      hasPassword: passwordHash !== null,
    }))

    return ok(sanitized)
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireSession(request)
    requireRole(session, ADMIN_ROLES)

    const { firstName, lastName, email, phone, role } = await request.json()

    if (!firstName || !lastName || !email || !role) {
      return err('firstName, lastName, email, and role are required')
    }

    if (!Object.values(Role).includes(role)) {
      return err('Invalid role')
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })
    if (existing) return err('A user with that email already exists', 409)

    const user = await prisma.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        role,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    return ok(user)
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}
