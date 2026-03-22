import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyMagicLinkToken, signSessionToken, buildSessionCookieHeader } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing_token', request.url))
  }

  try {
    const payload = verifyMagicLinkToken(token)

    const user = await prisma.user.findUnique({ where: { id: payload.userId } })

    if (!user || !user.isActive) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url))
    }

    const sessionToken = signSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    })

    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    response.headers.set('Set-Cookie', buildSessionCookieHeader(sessionToken))
    return response
  } catch {
    return NextResponse.redirect(new URL('/login?error=expired_token', request.url))
  }
}
