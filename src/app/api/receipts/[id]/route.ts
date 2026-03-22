import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { ok, err, notFound, serverError } from '@/lib/api'
import { Role } from '@prisma/client'
import { writeAudit } from '@/lib/audit'
import { ReceiptPatchSchema, parseBody } from '@/lib/validation'

function getId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/')
  return parts[parts.indexOf('receipts') + 1] ?? ''
}

export async function GET(req: NextRequest) {
  try {
    const session = requireSession(req)
    const id = getId(req)

    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
        lineItems: true,
      },
    })
    if (!receipt) return notFound('Receipt')

    // Field workers only see their own
    if (session.role === 'FIELD_WORKER' && receipt.uploadedByUserId !== session.userId) {
      return err('Forbidden', 403)
    }

    return ok(receipt)
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = requireSession(req)
    const id = getId(req)

    const receipt = await prisma.receipt.findUnique({ where: { id } })
    if (!receipt) return notFound('Receipt')

    const rawBody = await req.json()
    const parsed = parseBody(ReceiptPatchSchema, rawBody)
    if (!parsed.success) return err(parsed.error)
    const { vendor, receiptDate, totalAmount, taxAmount, deliveryFee, notes, status, lineItems } = parsed.data

    // Only Owner/Accountant/Admin can approve/reject
    const canApprove = ['OWNER', 'ACCOUNTANT', 'PLATFORM_ADMIN'].includes(session.role as string)
    if (status && !canApprove) return err('Forbidden', 403)

    // Update header
    const updated = await prisma.receipt.update({
      where: { id },
      data: {
        vendor: vendor !== undefined ? vendor : receipt.vendor,
        receiptDate: receiptDate !== undefined ? (receiptDate ? new Date(receiptDate) : null) : receipt.receiptDate,
        totalAmount: totalAmount !== undefined ? (totalAmount !== null ? parseFloat(String(totalAmount)) : null) : receipt.totalAmount,
        taxAmount: taxAmount !== undefined ? (taxAmount !== null ? parseFloat(String(taxAmount)) : null) : receipt.taxAmount,
        deliveryFee: deliveryFee !== undefined ? (deliveryFee !== null ? parseFloat(String(deliveryFee)) : null) : receipt.deliveryFee,
        notes: notes !== undefined ? notes : receipt.notes,
        status: status ?? receipt.status,
        reviewedByUserId: status ? session.userId : receipt.reviewedByUserId,
        reviewedAt: status ? new Date() : receipt.reviewedAt,
      },
    })

    // Optionally replace line items
    if (lineItems && Array.isArray(lineItems)) {
      await prisma.receiptLineItem.deleteMany({ where: { receiptId: id } })

      interface RawLineItem {
        description: string
        quantity: string | number
        unitCost: string | number
        amortizedTax?: string | number
        amortizedDelivery?: string | number
      }

      const processedItems = (lineItems as RawLineItem[]).map((li) => {
        const qty = parseFloat(String(li.quantity)) || 1
        const cost = parseFloat(String(li.unitCost)) || 0
        const extendedCost = qty * cost
        const amortizedTax = parseFloat(String(li.amortizedTax ?? 0)) || 0
        const amortizedDelivery = parseFloat(String(li.amortizedDelivery ?? 0)) || 0
        return {
          receiptId: id,
          description: li.description,
          quantity: qty,
          unitCost: cost,
          extendedCost,
          amortizedTax,
          amortizedDelivery,
          totalCost: extendedCost + amortizedTax + amortizedDelivery,
        }
      })

      await prisma.receiptLineItem.createMany({ data: processedItems })
    }

    if (status && status !== receipt.status) {
      await writeAudit({
        entityType: 'Receipt', entityId: id, action: 'STATUS_CHANGED',
        changedByUserId: session.userId,
        before: { status: receipt.status }, after: { status: updated.status },
      })
    }

    return ok(updated)
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, [Role.OWNER, Role.PLATFORM_ADMIN])

    const id = getId(req)
    const receipt = await prisma.receipt.findUnique({ where: { id } })
    if (!receipt) return notFound('Receipt')

    await prisma.receipt.delete({ where: { id } })
    return ok({ deleted: true })
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}
