import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { ok, err, notFound, serverError } from '@/lib/api'
import { Role } from '@prisma/client'

const ADMIN_ROLES = [Role.PLATFORM_ADMIN, Role.OWNER]

function getId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/')
  return parts[parts.indexOf('users') + 1] ?? ''
}

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request)
    requireRole(session, ADMIN_ROLES)

    const id = getId(request)
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) return notFound('User')

    const { passwordHash, ...rest } = user
    return ok({ ...rest, hasPassword: passwordHash !== null })
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = requireSession(request)
    requireRole(session, ADMIN_ROLES)

    const id = getId(request)
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) return notFound('User')

    const body = await request.json()
    const { firstName, lastName, phone, role, isActive } = body

    // Prevent removing the last PLATFORM_ADMIN
    if (
      isActive === false &&
      existing.role === Role.PLATFORM_ADMIN &&
      existing.id !== session.userId
    ) {
      const adminCount = await prisma.user.count({
        where: { role: Role.PLATFORM_ADMIN, isActive: true },
      })
      if (adminCount <= 1) return err('Cannot deactivate the last platform admin')
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        firstName: firstName !== undefined ? firstName.trim() : existing.firstName,
        lastName: lastName !== undefined ? lastName.trim() : existing.lastName,
        phone: phone !== undefined ? (phone?.trim() || null) : existing.phone,
        role: role !== undefined ? role : existing.role,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const { passwordHash, ...rest } = updated
    return ok({ ...rest, hasPassword: passwordHash !== null })
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}

// Admin: clear a user's password (forces magic-link-only login)
export async function DELETE(request: NextRequest) {
  try {
    const session = requireSession(request)
    requireRole(session, ADMIN_ROLES)

    const id = getId(request)
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) return notFound('User')

    await prisma.user.update({
      where: { id },
      data: { passwordHash: null },
    })

    return ok({ message: 'Password cleared. User must sign in via magic link.' })
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}
