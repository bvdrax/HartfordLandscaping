import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import WorkerForm from '@/components/workers/WorkerForm'

export default async function EditWorkerPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')

  if (!['OWNER', 'PLATFORM_ADMIN'].includes(session.role as string)) redirect('/workers')

  const [worker, crews] = await Promise.all([
    prisma.workerProfile.findUnique({
      where: { id: params.id },
      include: { user: true },
    }),
    prisma.crew.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])
  if (!worker) notFound()

  const initial = {
    firstName: worker.user.firstName,
    lastName: worker.user.lastName,
    email: worker.user.email,
    phone: worker.user.phone ?? '',
    role: worker.user.role,
    hourlyRate: worker.hourlyRate ? String(Number(worker.hourlyRate)) : '',
    payType: worker.payType,
    crewId: worker.crewId ?? '',
    emergencyContact: worker.emergencyContact ?? '',
    notes: worker.notes ?? '',
    isActive: worker.user.isActive,
  }

  return (
    <div className="p-6 space-y-6 max-w-lg">
      <div>
        <Link href={`/workers/${params.id}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit">
          <ChevronLeft size={16} />{worker.user.firstName} {worker.user.lastName}
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Edit Worker</h1>
      </div>
      <WorkerForm crews={crews} initial={initial} workerId={params.id} />
    </div>
  )
}
