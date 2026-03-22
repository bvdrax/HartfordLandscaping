import { MessageSquare } from 'lucide-react'

interface SmsButtonsProps {
  phone: string
  projectName: string
  portalUrl?: string
}

function encodeSms(phone: string, body: string) {
  // Strip non-digits from phone, format as +1XXXXXXXXXX
  const digits = phone.replace(/\D/g, '')
  const formatted = digits.startsWith('1') ? '+' + digits : '+1' + digits
  return `sms:${formatted}?body=${encodeURIComponent(body)}`
}

const TEMPLATES = [
  {
    label: 'Quote Ready',
    body: (name: string, url?: string) =>
      `Hi, your quote for ${name} is ready for review. ${url ? `View it here: ${url}` : 'Please contact us for details.'}`,
  },
  {
    label: 'Work Starting Tomorrow',
    body: (name: string) => `Hi, just a reminder that we are starting work on ${name} tomorrow. We will see you then!`,
  },
  {
    label: 'Work Complete',
    body: (name: string) => `Hi, the work on ${name} is now complete. Thank you for choosing Hartford Landscaping!`,
  },
  {
    label: 'Invoice Sent',
    body: (name: string) => `Hi, your invoice for ${name} has been sent to your email. Please let us know if you have any questions.`,
  },
]

export default function SmsButtons({ phone, projectName, portalUrl }: SmsButtonsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <MessageSquare size={14} />
        <span className="text-xs font-medium uppercase tracking-wide">SMS Customer</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map((t) => (
          <a
            key={t.label}
            href={encodeSms(phone, t.body(projectName, t.label === 'Quote Ready' ? portalUrl : undefined))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
          >
            <MessageSquare size={11} />
            {t.label}
          </a>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">Opens your SMS app pre-populated. You can edit before sending.</p>
    </div>
  )
}
