import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import UsersClient from './UsersClient'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'PLATFORM_ADMIN' && session.role !== 'OWNER') {
    redirect('/dashboard')
  }

  const users = await prisma.user.findMany({
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
      passwordHash: true,
      createdAt: true,
    },
  })

  const sanitized = users.map(({ passwordHash, ...u }) => ({
    ...u,
    hasPassword: passwordHash !== null,
  }))

  return <UsersClient users={sanitized} currentUserId={session.userId} />
}
