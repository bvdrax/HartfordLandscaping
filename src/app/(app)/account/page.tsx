import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AccountClient from './AccountClient'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true, firstName: true, lastName: true, email: true },
  })

  if (!user) redirect('/login')

  return (
    <AccountClient
      name={`${user.firstName} ${user.lastName}`}
      email={user.email}
      hasPassword={user.passwordHash !== null}
    />
  )
}
