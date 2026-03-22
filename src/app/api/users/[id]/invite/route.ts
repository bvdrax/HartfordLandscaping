import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { ok, err, notFound, serverError } from '@/lib/api'
import { signMagicLinkToken } from '@/lib/auth'
import { sendMagicLink } from '@/lib/email'
import { Role } from '@prisma/client'

function getId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/')
  return parts[parts.indexOf('users') + 1] ?? ''
}

export async function POST(request: NextRequest) {
  try {
    const session = requireSession(request)
    requireRole(session, [Role.PLATFORM_ADMIN, Role.OWNER])

    const id = getId(request)
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return notFound('User')
    if (!user.isActive) return err('Cannot invite a deactivated user', 400)

    const token = signMagicLinkToken(user.id, user.email)
    const magicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify?token=${token}`

    if (process.env.NODE_ENV === 'development') {
      console.log('\n Invite link (dev):', magicUrl, '\n')
    } else {
      await sendMagicLink({ to: user.email, magicUrl })
    }

    return ok({ message: `Invite sent to ${user.email}` })
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}
