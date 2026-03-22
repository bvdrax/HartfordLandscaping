import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signSessionToken, buildSessionCookieHeader } from '@/lib/auth'
import { ok, err, serverError } from '@/lib/api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body as { email: string; password: string }

    if (!email || !password) return err('Email and password are required')

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    // Generic error to prevent email enumeration
    if (!user || !user.isActive || !user.passwordHash) {
      return err('Invalid email or password', 401)
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return err('Invalid email or password', 401)

    const token = signSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    })

    const response = ok({ message: 'Logged in', redirect: '/dashboard' })
    const headers = new Headers(response.headers)
    headers.set('Set-Cookie', buildSessionCookieHeader(token))
    return new NextResponse(response.body, { status: response.status, headers })
  } catch (e) {
    return serverError(e)
  }
}
