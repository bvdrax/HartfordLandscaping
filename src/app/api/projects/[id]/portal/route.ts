import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, notFound, serverError, err } from '@/lib/api'
import { requireSession, ApiError } from '@/lib/middleware'
import { signPortalToken } from '@/lib/auth'
import { sendPortalLink } from '@/lib/email'

function getProjectId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/')
  const idx = parts.indexOf('portal')
  return idx > 0 ? parts[idx - 1] : ''
}

export async function POST(req: NextRequest) {
  try {
    requireSession(req)
    const projectId = getProjectId(req)

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { customers: { where: { isPrimary: true }, take: 1 } },
    })
    if (!project) return notFound('Project')

    const customer = project.customers[0]
    if (!customer) return err('No primary customer found on this project')
    if (!customer.email) return err('Primary customer has no email address')

    // Generate portal token (72h expiry)
    const token = signPortalToken(customer.id, projectId)
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)

    // Store token in customer record (overwrites previous — invalidates old links)
    await prisma.customer.update({
      where: { id: customer.id },
      data: { magicLinkToken: token, magicLinkExpiry: expiresAt },
    })

    // Send email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const portalUrl = `${baseUrl}/portal/${encodeURIComponent(token)}`
    await sendPortalLink({
      to: customer.email,
      customerName: `${customer.firstName} ${customer.lastName}`,
      projectName: project.name,
      portalUrl,
    })

    return ok({ sent: true, to: customer.email })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}
