import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import InvoiceForm from '@/components/invoices/InvoiceForm'

export default async function EditInvoicePage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const canEdit = ['OWNER', 'PROJECT_MANAGER', 'PLATFORM_ADMIN'].includes(session.role as string)
  if (!canEdit) redirect('/invoices')

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      project: { select: { id: true, name: true } },
      quote: { select: { id: true, versionNumber: true, total: true } },
    },
  })
  if (!invoice) notFound()
  if (invoice.status === 'VOID') redirect('/invoices/' + params.id)

  const quotes = await prisma.quote.findMany({
    where: { projectId: invoice.projectId, status: { in: ['APPROVED', 'SENT'] } },
    select: { id: true, versionNumber: true, total: true },
    orderBy: { versionNumber: 'desc' },
  })

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Edit {invoice.invoiceNumber}</h1>
        <p className="text-sm text-muted-foreground mt-1">{invoice.project.name}</p>
      </div>
      <InvoiceForm
        projects={[{ id: invoice.project.id, name: invoice.project.name }]}
        defaultProjectId={invoice.project.id}
        quotes={quotes.map((q) => ({ id: q.id, versionNumber: q.versionNumber, total: Number(q.total) }))}
        initial={{
          id: invoice.id,
          type: invoice.type as string,
          amountDue: Number(invoice.amountDue),
          taxRate: Number(invoice.taxRate),
          dueDate: invoice.dueDate?.toISOString() ?? null,
          notes: invoice.notes,
          quoteId: invoice.quoteId,
        }}
      />
    </div>
  )
}
