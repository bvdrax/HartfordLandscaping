import { Resend } from 'resend'

let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

const FROM = 'Hartford Landscaping <noreply@hartfordlandscaping.com>'

export async function sendPortalLink({
  to,
  customerName,
  projectName,
  portalUrl,
}: {
  to: string
  customerName: string
  projectName: string
  portalUrl: string
}) {
  const resend = getResend()
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your project portal: ${projectName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;">
        <h2 style="color:#2D6A4F;">Hartford Landscaping</h2>
        <p>Hi ${customerName},</p>
        <p>Your project portal for <strong>${projectName}</strong> is ready. You can view project progress, review your quote, and more.</p>
        <p style="margin:28px 0;">
          <a href="${portalUrl}" style="background:#2D6A4F;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
            View Project Portal
          </a>
        </p>
        <p style="color:#666;font-size:13px;">This link expires in 72 hours. If you need a new link, contact your project manager.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#888;font-size:12px;">Hartford Landscaping</p>
      </div>
    `,
  })
}

export async function sendInvoiceEmail({
  to,
  customerName,
  projectName,
  invoiceNumber,
  total,
  dueDate,
  paymentUrl,
}: {
  to: string
  customerName: string
  projectName: string
  invoiceNumber: string
  total: number
  dueDate: Date | null
  paymentUrl: string | null
}) {
  const resend = getResend()
  const dueLine = dueDate ? `<p>Due: <strong>${new Date(dueDate).toLocaleDateString()}</strong></p>` : ''
  const payBtn = paymentUrl
    ? `<p style="margin:28px 0;"><a href="${paymentUrl}" style="background:#2D6A4F;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Pay Now</a></p>`
    : ''
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Invoice ${invoiceNumber} from Hartford Landscaping`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;">
        <h2 style="color:#2D6A4F;">Hartford Landscaping</h2>
        <p>Hi ${customerName},</p>
        <p>Your invoice for <strong>${projectName}</strong> is ready.</p>
        <p>Invoice: <strong>${invoiceNumber}</strong></p>
        <p>Amount Due: <strong>$${total.toFixed(2)}</strong></p>
        ${dueLine}
        ${payBtn}
        <p style="color:#666;font-size:13px;">Questions? Contact your project manager.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#888;font-size:12px;">Hartford Landscaping</p>
      </div>
    `,
  })
}

export async function sendMagicLink({
  to,
  magicUrl,
}: {
  to: string
  magicUrl: string
}) {
  const resend = getResend()
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your Hartford Landscaping sign-in link',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;">
        <h2 style="color:#2D6A4F;">Hartford Landscaping</h2>
        <p>Click the link below to sign in. This link expires in 15 minutes.</p>
        <p style="margin:28px 0;">
          <a href="${magicUrl}" style="background:#2D6A4F;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
            Sign In
          </a>
        </p>
        <p style="color:#666;font-size:13px;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  })
}
