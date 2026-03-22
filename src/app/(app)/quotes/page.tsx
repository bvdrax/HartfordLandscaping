import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import QuoteStatusBadge from '@/components/quotes/QuoteStatusBadge'

export default async function QuotesPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const roleStr = session.role as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (roleStr === 'FIELD_WORKER' || roleStr === 'SUBCONTRACTOR') {
    const worker = await prisma.workerProfile.findUnique({ where: { userId: session.userId } })
    if (worker?.crewId) where.project = { crewId: worker.crewId }
    else return <div className="p-6"><h1 className="text-2xl font-bold">Quotes</h1><p className="text-muted-foreground mt-2">No crew assigned.</p></div>
  }

  const quotes = await prisma.quote.findMany({
    where,
    include: { project: { select: { id: true, name: true } }, _count: { select: { lineItems: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Quotes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{quotes.length} quote{quotes.length !== 1 ? 's' : ''}</p>
      </div>

      {quotes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No quotes yet</p>
          <p className="text-sm mt-1">Create quotes from a project page.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Project</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Version</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Total</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {quotes.map((q) => (
                <tr key={q.id} className="bg-card hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/quotes/${q.id}`} className="font-medium text-foreground hover:text-primary">
                      {q.project.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">v{q.versionNumber}</td>
                  <td className="px-3 py-3"><QuoteStatusBadge status={q.status} /></td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">${Number(q.total).toFixed(2)}</td>
                  <td className="px-3 py-3 text-muted-foreground">{new Date(q.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
