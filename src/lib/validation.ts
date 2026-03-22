import { z } from 'zod'

export const MagicLinkSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().optional(),
})

export const ProjectPatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  projectType: z.string().optional(),
  status: z.enum(['LEAD', 'QUOTED', 'APPROVED', 'SCHEDULED', 'IN_PROGRESS', 'PUNCH_LIST', 'COMPLETE', 'INVOICED', 'PAID', 'ARCHIVED']).optional(),
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip: z.string().max(20).optional(),
  startDate: z.string().nullable().optional(),
  estimatedEndDate: z.string().nullable().optional(),
  estimatedHours: z.union([z.string(), z.number()]).nullable().optional(),
  crewId: z.string().nullable().optional(),
  projectManagerId: z.string().nullable().optional(),
  globalMarginOverride: z.union([z.string(), z.number()]).nullable().optional(),
  notes: z.string().nullable().optional(),
  internalNotes: z.string().nullable().optional(),
})

export const QuotePatchSchema = z.object({
  notes: z.string().nullable().optional(),
  termsAndConditions: z.string().nullable().optional(),
  status: z.enum(['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED']).optional(),
})

export const ReceiptPatchSchema = z.object({
  vendor: z.string().max(200).optional(),
  receiptDate: z.string().nullable().optional(),
  totalAmount: z.union([z.string(), z.number()]).nullable().optional(),
  taxAmount: z.union([z.string(), z.number()]).nullable().optional(),
  deliveryFee: z.union([z.string(), z.number()]).nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(['PENDING', 'REVIEWED', 'APPROVED', 'REJECTED']).optional(),
  expenseType: z.enum(['BUSINESS', 'PERSONAL']).optional(),
  purchasedByUserId: z.string().nullable().optional(),
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.union([z.string(), z.number()]),
    unitCost: z.union([z.string(), z.number()]),
    amortizedTax: z.union([z.string(), z.number()]).optional(),
    amortizedDelivery: z.union([z.string(), z.number()]).optional(),
    projectId: z.string().nullable().optional(),
    expenseType: z.enum(['BUSINESS', 'PERSONAL']).nullable().optional(),
  })).optional(),
})

export const TimeLogPatchSchema = z.object({
  clockInAt: z.string().optional(),
  clockOutAt: z.string().optional(),
  breakMinutes: z.union([z.string(), z.number()]).optional(),
  notes: z.string().nullable().optional(),
  approved: z.boolean().optional(),
})

/** Parse and return data, or throw a Response-compatible error object */
export function parseBody<T>(schema: z.ZodType<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (!result.success) {
    const message = result.error.errors.map((e) => e.message).join(', ')
    return { success: false, error: message }
  }
  return { success: true, data: result.data }
}
