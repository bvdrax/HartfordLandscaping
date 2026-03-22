import twilio from 'twilio'

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) throw new Error('Twilio not configured')
  return twilio(sid, token)
}

export async function sendSms(to: string, body: string): Promise<void> {
  const from = process.env.TWILIO_FROM_NUMBER
  if (!from) throw new Error('TWILIO_FROM_NUMBER not set')
  const client = getClient()
  await client.messages.create({ to, from, body })
}

export function formatScheduleSms(workerName: string, projectName: string, startDate: Date, endDate: Date | null): string {
  const start = startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const end = endDate ? endDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD'
  return `Hartford Landscaping: Hi ${workerName}, you've been scheduled for "${projectName}" starting ${start} through ${end}. Questions? Contact your project manager.`
}
