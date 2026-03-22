import prisma from './prisma'

interface AuditParams {
  entityType: string
  entityId: string
  action: string
  changedByUserId?: string | null
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}

/**
 * Write a single audit log entry. Fire-and-forget safe — errors are swallowed
 * so a failed audit write never breaks the main operation.
 */
export async function writeAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        changedByUserId: params.changedByUserId ?? null,
        before: params.before ?? undefined,
        after: params.after ?? undefined,
      },
    })
  } catch {
    // Never let audit failures surface to callers
  }
}
