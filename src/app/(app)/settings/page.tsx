import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import SettingsForm from '@/components/SettingsForm'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const roleStr = session.role as string
  if (!['OWNER', 'PLATFORM_ADMIN'].includes(roleStr)) redirect('/dashboard')

  const settings = await prisma.globalSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
  })

  const settingsData = {
    defaultMarginPct: Number(settings.defaultMarginPct),
    defaultTaxRate: Number(settings.defaultTaxRate),
    companyName: settings.companyName,
    companyPhone: settings.companyPhone,
    companyEmail: settings.companyEmail,
    companyAddress: settings.companyAddress,
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Global defaults for margin, tax, and company info</p>
      </div>
      <SettingsForm settings={settingsData} />
    </div>
  )
}
