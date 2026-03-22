import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSupabaseAdmin, RECEIPTS_BUCKET } from '@/lib/supabase'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { ok, err, serverError } from '@/lib/api'
import { Role } from '@prisma/client'

const UPLOAD_ROLES: Role[] = [Role.OWNER, Role.PLATFORM_ADMIN, Role.ACCOUNTANT, Role.PROJECT_MANAGER, Role.FIELD_WORKER]
const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']

export async function GET(req: NextRequest) {
  try {
    const session = requireSession(req)
    const role = session.role as string
    const { searchParams } = req.nextUrl
    const projectId = searchParams.get('projectId')

    const isWorker = ['FIELD_WORKER'].includes(role)
    const where: Record<string, unknown> = {}
    if (isWorker) where.uploadedByUserId = session.userId
    if (projectId) where.projectId = projectId

    const receipts = await prisma.receipt.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { lineItems: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return ok(receipts)
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, UPLOAD_ROLES)

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const projectId = formData.get('projectId') as string | null
    const vendor = formData.get('vendor') as string | null
    const receiptDate = formData.get('receiptDate') as string | null
    const totalAmount = formData.get('totalAmount') as string | null
    const taxAmount = formData.get('taxAmount') as string | null
    const deliveryFee = formData.get('deliveryFee') as string | null
    const notes = formData.get('notes') as string | null
    const expenseType = (formData.get('expenseType') as string | null) ?? 'BUSINESS'
    const purchasedByUserId = formData.get('purchasedByUserId') as string | null
    const lineItemsJson = formData.get('lineItems') as string | null

    if (!projectId) return err('projectId is required')

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return err('Project not found', 404)

    // Handle file upload
    let storageUrl: string | null = null
    if (file && file.size > 0) {
      if (file.size > MAX_FILE_SIZE) return err('File too large (max 15 MB)')
      if (!ALLOWED_TYPES.includes(file.type)) return err('Invalid file type')

      const ext = file.name.split('.').pop() ?? 'jpg'
      const storagePath = `${projectId}/${crypto.randomUUID()}.${ext}`
      const arrayBuffer = await file.arrayBuffer()

      const supabase = getSupabaseAdmin()
      const { error: uploadError } = await supabase.storage
        .from(RECEIPTS_BUCKET)
        .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false })

      if (uploadError) {
        console.error('Supabase upload error:', uploadError)
        return err('Failed to upload receipt image')
      }

      const { data: urlData } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(storagePath)
      storageUrl = urlData.publicUrl
    }

    // Parse line items
    interface RawLineItem {
      description: string
      quantity: string | number
      unitCost: string | number
      projectId?: string | null
      expenseType?: string | null
    }
    let lineItems: RawLineItem[] = []
    if (lineItemsJson) {
      try { lineItems = JSON.parse(lineItemsJson) } catch { /* ignore */ }
    }

    // Parse header amounts
    const total = totalAmount ? parseFloat(totalAmount) : null
    const tax = taxAmount ? parseFloat(taxAmount) : null
    const delivery = deliveryFee ? parseFloat(deliveryFee) : null

    // Compute line item extended costs and amortize tax/delivery
    const processedItems = lineItems.map((li) => {
      const qty = parseFloat(String(li.quantity)) || 1
      const cost = parseFloat(String(li.unitCost)) || 0
      return {
        description: li.description,
        quantity: qty,
        unitCost: cost,
        extendedCost: qty * cost,
        projectId: li.projectId ?? null,
        expenseType: (li.expenseType as 'BUSINESS' | 'PERSONAL' | null) ?? null,
      }
    })

    const totalExtended = processedItems.reduce((s, li) => s + li.extendedCost, 0)

    const withAmortization = processedItems.map((li) => {
      const ratio = totalExtended > 0 ? li.extendedCost / totalExtended : 0
      const amortizedTax = tax ? Math.round(tax * ratio * 100) / 100 : 0
      const amortizedDelivery = delivery ? Math.round(delivery * ratio * 100) / 100 : 0
      return {
        ...li,
        amortizedTax,
        amortizedDelivery,
        totalCost: li.extendedCost + amortizedTax + amortizedDelivery,
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const receipt = await (prisma.receipt.create as any)({
      data: {
        projectId,
        uploadedByUserId: session.userId,
        purchasedByUserId: purchasedByUserId || null,
        vendor: vendor || null,
        receiptDate: receiptDate ? new Date(receiptDate) : null,
        totalAmount: total ?? null,
        taxAmount: tax ?? null,
        deliveryFee: delivery ?? null,
        storageUrl,
        expenseType: (expenseType === 'PERSONAL' ? 'PERSONAL' : 'BUSINESS'),
        notes: notes || null,
        lineItems: {
          create: withAmortization.map((li) => ({
            description: li.description,
            quantity: li.quantity,
            unitCost: li.unitCost,
            extendedCost: li.extendedCost,
            amortizedTax: li.amortizedTax,
            amortizedDelivery: li.amortizedDelivery,
            totalCost: li.totalCost,
            projectId: li.projectId,
            expenseType: li.expenseType,
          })),
        },
      },
      include: { lineItems: true },
    })

    return ok(receipt)
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}
