import prisma from '@/lib/prisma';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface AuditEntry {
  id: number;
  user_id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  batch_id: string | null;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: Date;
  undone_at: Date | null;
}

export async function writeAuditLog(params: {
  userId: number;
  entityType: string;
  entityId: number;
  action: AuditAction;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  batchId?: string;
}): Promise<void> {
  await prisma.audit_log.create({
    data: {
      user_id: params.userId,
      entity_type: params.entityType,
      entity_id: params.entityId,
      action: params.action,
      previous_value: params.previousValue,
      new_value: params.newValue,
      batch_id: params.batchId,
    },
  });
}

export async function getAuditLog(params: {
  entityType?: string;
  entityId?: number;
  limit?: number;
  offset?: number;
}): Promise<AuditEntry[]> {
  const where: Record<string, unknown> = {};
  if (params.entityType) where.entity_type = params.entityType;
  if (params.entityId) where.entity_id = params.entityId;

  return prisma.audit_log.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: params.limit ?? 50,
    skip: params.offset ?? 0,
  }) as Promise<AuditEntry[]>;
}

// Map entity_type string to the Prisma model delegate
function getModelDelegate(entityType: string) {
  const models: Record<string, any> = {
    accounts: prisma.accounts,
    transactions: prisma.transactions,
    net_worth_history: prisma.net_worth_history,
    income_sources: prisma.income_sources,
  };
  const model = models[entityType];
  if (!model) throw new Error(`Unknown entity type: ${entityType}`);
  return model;
}

export async function undoAuditEntry(entryId: number): Promise<void> {
  const entry = await prisma.audit_log.findUnique({ where: { id: entryId } });
  if (!entry) throw new Error('Audit entry not found');
  if (entry.undone_at) throw new Error('Audit entry already undone');
  await undoEntry(entry as any);
}

async function undoEntry(entry: {
  id: number;
  user_id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  previous_value: unknown;
  new_value: unknown;
}): Promise<void> {
  const model = getModelDelegate(entry.entity_type);

  await prisma.$transaction(async (_tx: any) => {
    if (entry.action === 'UPDATE') {
      await model.update({
        where: { id: entry.entity_id },
        data: entry.previous_value as Record<string, unknown>,
      });
    } else if (entry.action === 'CREATE') {
      await model.update({
        where: { id: entry.entity_id },
        data: { deleted_at: new Date() },
      });
    } else if (entry.action === 'DELETE') {
      await model.update({
        where: { id: entry.entity_id },
        data: { deleted_at: null },
      });
    }

    // Mark the original entry as undone
    await prisma.audit_log.update({
      where: { id: entry.id },
      data: { undone_at: new Date() },
    });

    // Write compensating audit entry
    await prisma.audit_log.create({
      data: {
        user_id: entry.user_id,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        action: 'UPDATE',
        previous_value: entry.new_value as any,
        new_value: entry.previous_value as any,
      },
    });
  });
}

export async function undoBatch(batchId: string): Promise<void> {
  const entries = await prisma.audit_log.findMany({
    where: { batch_id: batchId },
    orderBy: { created_at: 'desc' },
  });

  for (const entry of entries) {
    await undoEntry(entry as any);
  }
}
