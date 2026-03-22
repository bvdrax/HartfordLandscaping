import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { signMagicLinkToken, signSessionToken, buildSessionCookieHeader } from '@/lib/auth'
import { ok, err, serverError } from '@/lib/api'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body as { email: string; password?: string }

    if (!email) return err('Email is required')

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })

    if (!user || !user.isActive) {
      return ok({ message: 'If that email is registered, a link has been sent.' })
    }

    // Dev mode password bypass
    if (process.env.DEV_PASSWORD_AUTH === 'true' && password) {
      const hash = createHash('sha256').update(password).digest('hex')
      if (!user.passwordHash || hash !== user.passwordHash) {
        return err('Invalid credentials', 401)
      }

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
    }

    // Magic link flow
    const magicToken = signMagicLinkToken(user.id, user.email)
    const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify?token=${magicToken}`

    if (process.env.NODE_ENV === 'development') {
      console.log('\n Magic link (dev):', magicLink, '\n')
    } else {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'Hartford Landscaping <no-reply@hartfordlandscaping.com>',
        to: user.email,
        subject: 'Your login link',
        html: `<p>Hi ${user.firstName}, <a href="${magicLink}">click here to sign in</a>. Expires in 15 minutes.</p>`,
      })
    }

    return ok({ message: 'If that email is registered, a link has been sent.' })
  } catch (e) {
    return serverError(e)
  }
}
