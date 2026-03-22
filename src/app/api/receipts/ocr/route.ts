import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { ok, err, serverError } from '@/lib/api'
import { Role } from '@prisma/client'
import { checkRateLimit } from '@/lib/rate-limit'

const ALLOWED_ROLES: Role[] = [Role.OWNER, Role.PLATFORM_ADMIN, Role.ACCOUNTANT, Role.PROJECT_MANAGER, Role.FIELD_WORKER]
const MAX_FILE_SIZE = 15 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, ALLOWED_ROLES)

    // Rate limit: 20 OCR requests per user per hour
    const rl = checkRateLimit(`ocr:${session.userId}`, { windowMs: 60 * 60 * 1000, max: 20 })
    if (!rl.allowed) {
      return new NextResponse(JSON.stringify({ data: null, error: 'OCR rate limit exceeded. Try again later.', meta: null }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return err('Anthropic API not configured', 500)

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file || file.size === 0) return err('Image file is required')
    if (file.size > MAX_FILE_SIZE) return err('File too large (max 15 MB)')

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) return err('File must be an image (JPEG, PNG, WebP, or GIF)')

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                data: base64,
              },
            },
            {
              type: 'text',
              text: `Analyze this receipt image and extract the data as JSON. Return ONLY valid JSON, no explanation.

Required format:
{
  "vendor": "store name or null",
  "receiptDate": "YYYY-MM-DD or null",
  "totalAmount": number or null,
  "taxAmount": number or null,
  "deliveryFee": number or null,
  "lineItems": [
    {
      "description": "item description",
      "quantity": number,
      "unitCost": number
    }
  ]
}

Rules:
- All amounts in dollars as plain numbers (e.g., 12.99 not "$12.99")
- If a field is not visible or unclear, use null
- For lineItems, extract individual products/services if visible
- If only a total is visible with no line items, return an empty lineItems array
- quantity defaults to 1 if not shown`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Strip markdown code fences if present
    const clean = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(clean)
    } catch {
      return err('OCR failed to return valid JSON — please enter data manually')
    }

    return ok(parsed)
  } catch (e) {
    if (e instanceof ApiError) return err(e.message, e.status)
    return serverError(e)
  }
}
