import { transferDb, lockUnlinkedTransfer } from '@/lib/transfer-db';
import type { Prisma } from '@prisma/client';
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
  userId: number;
  entityType?: string;
  entityId?: number;
  limit?: number;
  offset?: number;
}): Promise<AuditEntry[]> {
  const where: Record<string, unknown> = { user_id: params.userId };
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
    transfers: prisma.transfers,
    categorization_rules: prisma.categorization_rules,
  };
  const model = models[entityType];
  if (!model) throw new Error(`Unknown entity type: ${entityType}`);
  return model;
}

function assertUndoSafe(entry: { batch_id?: string | null; new_value?: unknown }): void {
  const value = entry.new_value && typeof entry.new_value === 'object' ? entry.new_value as Record<string, unknown> : {};
  if (value.payment_reconciliation) throw new Error('Use Unlink entry in the transfer details to reverse a payment match safely');
  if (value.backup_restore || entry.batch_id?.startsWith('restore:')) throw new Error('Backup restore cannot be partially undone through history');
}

async function assertCurrentUndoSafe(entry: { entity_type: string; entity_id: number; user_id: number; previous_value?: unknown }): Promise<void> {
  if (entry.entity_type === 'transactions') {
    const current = await prisma.transactions.findFirst({ where: { id: entry.entity_id, user_id: entry.user_id }, select: { transfer_id: true } });
    const previous = entry.previous_value && typeof entry.previous_value === 'object' ? entry.previous_value as Record<string, unknown> : {};
    if (current?.transfer_id != null || previous.transfer_id != null) {
      throw new Error('Unlink the statement payment before undoing its history');
    }
    if (await prisma.transactions.count({ where: { original_transaction_id: entry.entity_id, deleted_at: null } })) {
      throw new Error('Unlink refunds from this purchase before undoing its history');
    }
  } else if (entry.entity_type === 'transfers') {
    if (await prisma.transactions.count({ where: { transfer_id: entry.entity_id, deleted_at: null } })) {
      throw new Error('Unlink statement payments before undoing transfer history');
    }
  }
}

function undoWhere(entry: { entity_type: string; entity_id: number; user_id: number }) {
  // Recheck links in the mutation itself, so a match created after the preflight
  // cannot be removed by undoing an older import or transfer edit.
  if (entry.entity_type === 'transactions') return {
    id: entry.entity_id, user_id: entry.user_id, transfer_id: null, other_transactions: { none: { deleted_at: null } },
  };
  if (entry.entity_type === 'transfers') return {
    id: entry.entity_id, user_id: entry.user_id, transactions: { none: { deleted_at: null } },
  };
  return { id: entry.entity_id, user_id: entry.user_id };
}

export async function undoAuditEntry(entryId: number, userId: number): Promise<void> {
  const entry = await prisma.audit_log.findUnique({ where: { id: entryId, user_id: userId } });
  if (!entry) throw new Error('Audit entry not found');
  if (entry.undone_at) throw new Error('Audit entry already undone');
  assertUndoSafe(entry);
  await assertCurrentUndoSafe(entry);
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
  if (entry.entity_type === 'transfers') {
    await transferDb.$transaction(async (db) => {
      await lockUnlinkedTransfer(db, entry.user_id, entry.entity_id, 'undoing transfer history', true);
      // Another undo may have completed while this request waited for the row.
      const current = await db.audit_log.findUnique({ where: { id: entry.id, user_id: entry.user_id } });
      if (!current) throw new Error('Audit entry not found');
      if (current.undone_at) throw new Error('Audit entry already undone');
      assertUndoSafe(current);
      let data: Prisma.transfersUncheckedUpdateInput;
      if (current.action === 'UPDATE') {
        const previous = current.previous_value as Record<string, unknown> | null;
        if (!previous) throw new Error('Transfer history has no previous value');
        const { id: _id, user_id: _owner, ...fields } = previous;
        data = fields as Prisma.transfersUncheckedUpdateInput;
      } else if (current.action === 'CREATE') data = { deleted_at: new Date() };
      else if (current.action === 'DELETE') data = { deleted_at: null };
      else throw new Error('Unknown audit action');
      await db.transfers.update({ where: { id: entry.entity_id, user_id: entry.user_id }, data });
      await db.audit_log.update({ where: { id: entry.id, user_id: entry.user_id }, data: { undone_at: new Date() } });
    });
    return;
  }
  await assertCurrentUndoSafe(entry);
  const model = getModelDelegate(entry.entity_type);
  const where = undoWhere(entry);

  await prisma.$transaction(async (_tx: any) => {
    if (entry.action === 'UPDATE') {
      await model.update({
        where,
        data: entry.previous_value as Record<string, unknown>,
      });
    } else if (entry.action === 'CREATE') {
      await model.update({
        where,
        data: { deleted_at: new Date() },
      });
    } else if (entry.action === 'DELETE') {
      await model.update({
        where,
        data: { deleted_at: null },
      });
    }

    // Mark the original entry as undone
    await prisma.audit_log.update({
      where: { id: entry.id, user_id: entry.user_id },
      data: { undone_at: new Date() },
    });
  });
}

export async function undoBatch(batchId: string, userId: number): Promise<void> {
  const entries = await prisma.audit_log.findMany({
    where: { batch_id: batchId, user_id: userId },
    orderBy: { created_at: 'desc' },
  });

  entries.forEach(assertUndoSafe);
  // Preflight the entire batch before touching its first entry.
  for (const entry of entries) await assertCurrentUndoSafe(entry);
  for (const entry of entries) {
    await undoEntry(entry as any);
  }
}
