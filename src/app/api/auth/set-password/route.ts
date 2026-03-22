import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requireSession, ApiError } from '@/lib/middleware'
import { ok, err, serverError } from '@/lib/api'

export async function POST(request: NextRequest) {
  try {
    const session = requireSession(request)
    const { password } = await request.json() as { password: string }

    if (!password || password.length < 8) {
      return err('Password must be at least 8 characters')
    }

    const hash = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash: hash },
    })

    return ok({ message: 'Password set successfully' })
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = requireSession(request)

    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash: null },
    })

    return ok({ message: 'Password removed. Use magic link to sign in.' })
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}
