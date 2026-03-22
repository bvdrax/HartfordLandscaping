import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, notFound, serverError } from '@/lib/api'
import { verifyPortalToken } from '@/lib/auth'
import { ApiError } from '@/lib/middleware'

function getToken(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/')
  return decodeURIComponent(parts[parts.length - 1] ?? '')
}

export async function GET(req: NextRequest) {
  try {
    const token = getToken(req)

    // Verify JWT
    let customerId: string
    let projectId: string
    try {
      const payload = verifyPortalToken(token)
      customerId = payload.customerId
      projectId = payload.projectId
    } catch {
      return NextResponse.json({ data: null, error: 'Invalid or expired portal link', meta: null }, { status: 401 })
    }

    // Check token matches stored token (invalidation check)
    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    if (!customer) return notFound('Customer')
    if (customer.magicLinkToken !== token) {
      return NextResponse.json({ data: null, error: 'This portal link has been superseded. Please request a new link.', meta: null }, { status: 401 })
    }
    if (customer.magicLinkExpiry && customer.magicLinkExpiry < new Date()) {
      return NextResponse.json({ data: null, error: 'Portal link has expired. Please request a new link.', meta: null }, { status: 401 })
    }

    // Load project data
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        customers: true,
        photos: {
          where: { category: { in: ['BEFORE', 'IN_PROGRESS', 'AFTER'] } },
          orderBy: { uploadedAt: 'desc' },
          take: 20,
        },
        quotes: {
          where: { status: { in: ['SENT', 'APPROVED', 'REJECTED'] } },
          include: {
            lineItems: { orderBy: { sortOrder: 'asc' } },
          },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
        invoices: {
          where: { status: { not: 'VOID' } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!project) return notFound('Project')

    return ok({
      customer: { id: customer.id, firstName: customer.firstName, lastName: customer.lastName },
      project: {
        id: project.id,
        name: project.name,
        status: project.status as string,
        siteAddress: project.siteAddress,
        startDate: project.startDate?.toISOString() ?? null,
        estimatedEndDate: project.estimatedEndDate?.toISOString() ?? null,
        photos: project.photos.map((p) => ({
          id: p.id,
          storageUrl: p.storageUrl,
          thumbnailUrl: p.thumbnailUrl,
          category: p.category as string,
          caption: p.caption,
        })),
        activeQuote: project.quotes[0]
          ? {
              id: project.quotes[0].id,
              versionNumber: project.quotes[0].versionNumber,
              status: project.quotes[0].status as string,
              total: Number(project.quotes[0].total),
              materialsTotal: Number(project.quotes[0].materialsTotal),
              laborTotal: Number(project.quotes[0].laborTotal),
              taxTotal: Number(project.quotes[0].taxTotal),
              notes: project.quotes[0].notes,
              termsAndConditions: project.quotes[0].termsAndConditions,
              expiresAt: project.quotes[0].expiresAt?.toISOString() ?? null,
              approvedAt: project.quotes[0].approvedAt?.toISOString() ?? null,
              lineItems: project.quotes[0].lineItems.map((li) => ({
                id: li.id,
                description: li.description,
                quantity: Number(li.quantity),
                unitPrice: Number(li.unitPrice),
                laborPricePerUnit: Number(li.laborPricePerUnit),
                lineTotal: Number(li.lineTotal),
              })),
            }
          : null,
        invoices: project.invoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          status: inv.status as string,
          type: inv.type as string,
          amountDue: Number(inv.amountDue),
          amountPaid: Number(inv.amountPaid),
          total: Number(inv.total),
          dueDate: inv.dueDate?.toISOString() ?? null,
          sentAt: inv.sentAt?.toISOString() ?? null,
        })),
      },
    })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    return serverError(e)
  }
}
