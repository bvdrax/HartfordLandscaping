import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import WorkerForm from '@/components/workers/WorkerForm'

export default async function NewWorkerPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const role = session.role as string
  if (!['OWNER', 'PLATFORM_ADMIN'].includes(role)) redirect('/workers')

  const crews = await prisma.crew.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="p-6 space-y-6 max-w-lg">
      <div>
        <Link href="/workers" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit">
          <ChevronLeft size={16} />Workers
        </Link>
        <h1 className="text-2xl font-bold text-foreground">New Worker</h1>
        <p className="text-sm text-muted-foreground mt-1">Creates a new user account and worker profile.</p>
      </div>
      <WorkerForm crews={crews} />
    </div>
  )
}
