import Papa from 'papaparse';
import { entitySchemas } from '@/lib/schemas';
import prisma from '@/lib/prisma';
import { withAuditContext } from '@/lib/audit-context';
import { randomUUID } from 'node:crypto';
import {
  EXPORTABLE_ENTITIES,
  type ExportableEntity,
  type ValidationError,
  type ImportValidationResult,
  type ConflictReport,
} from '@/lib/constants';

export type { ValidationError, ImportValidationResult, ConflictReport };

async function assertOwnedReference(userId: number, entity: string, id: unknown) {
  if (id == null) return null;
  if (!Number.isInteger(id) || Number(id) <= 0) throw new Error(`Invalid ${entity} reference`);
  const model = (prisma as any)[entity];
  const row = await model.findFirst({ where: { id, user_id: userId, deleted_at: null } });
  if (!row) throw new Error(`${entity} reference not found or unauthorized`);
  return row;
}

async function assertImportReferences(userId: number, entity: string, data: Record<string, unknown>) {
  if (entity === 'transactions') {
    const account = await assertOwnedReference(userId, 'accounts', data.account_id);
    if (data.original_transaction_id != null) {
      const original = await assertOwnedReference(userId, 'transactions', data.original_transaction_id);
      if (data.type !== 'refund' || original.type !== 'expense' || original.account_id !== account?.id) {
        throw new Error('Refund must reference an expense in the same account');
      }
    }
  }
  if (entity === 'transfers') {
    const from = await assertOwnedReference(userId, 'accounts', data.from_account_id);
    const to = await assertOwnedReference(userId, 'accounts', data.to_account_id);
    if (from?.currency !== to?.currency) throw new Error('Transfer accounts must share a currency');
  }
  if (entity === 'income_budgets') await assertOwnedReference(userId, 'income_sources', data.income_source_id);
  // Provenance contains polymorphic IDs; it is restored together with its targets,
  // never accepted as an arbitrary attachment to another user's records.
  if (entity === 'provenance') throw new Error('Restore provenance together with a backup');
}

export function parseCsvEntity(csv: string): Record<string, string>[] {
  if (!csv.trim()) return [];
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  return result.data;
}

export function validateRows(entity: string, rows: Record<string, unknown>[]): ImportValidationResult {
  const schema = entitySchemas[entity];
  if (!schema) throw new Error(`Unknown entity: ${entity}`);

  const valid: Record<string, unknown>[] = [];
  const errors: ValidationError[] = [];

  rows.forEach((row, i) => {
    const result = schema.safeParse(row);
    if (result.success) {
      valid.push(result.data as Record<string, unknown>);
    } else {
      for (const issue of result.error.issues) {
        errors.push({
          row: i + 2,
          field: issue.path.join('.'),
          message: issue.message,
        });
      }
    }
  });

  return { entity, total: rows.length, valid, errors };
}

export async function detectConflicts(
  userId: number,
  entity: string,
  rows: Record<string, unknown>[],
): Promise<ConflictReport> {
  const ids = rows.map((r) => r.id).filter((id): id is number => typeof id === 'number');
  if (ids.length === 0) return { entity, existingCount: 0, existingIds: [] };

  const model = (prisma as any)[entity];
  const existing = await model.findMany({
    where: { user_id: userId, id: { in: ids } },
    select: { id: true },
  });

  const existingIds = existing.map((r: { id: number }) => r.id);
  return { entity, existingCount: existingIds.length, existingIds };
}

export async function commitImport(
  userId: number,
  entity: string,
  rows: Record<string, unknown>[],
  mode: 'skip' | 'overwrite',
): Promise<{ created: number; updated: number; skipped: number; insertedIds: number[] }> {
  if (!EXPORTABLE_ENTITIES.includes(entity as ExportableEntity)) {
    throw new Error(`Unknown entity: ${entity}`);
  }

  const validatedRows: Record<string, unknown>[] = [];
  for (const row of rows) {
    if (entity === 'transactions' && row.transfer_id != null && row.transfer_id !== '') {
      throw new Error('Use payment matching or backup restore to link statement entries');
    }
    const data = entitySchemas[entity].parse(row) as Record<string, unknown>;
    if (entity === 'transactions' && row.id != null && data.original_transaction_id === row.id) throw new Error('A refund cannot reference itself');
    await assertImportReferences(userId, entity, data);
    validatedRows.push({ ...data, ...(row.id != null ? { id: row.id } : {}) });
  }

  const model = (prisma as any)[entity];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const insertedIds: number[] = [];

  const batchId = randomUUID();

  await withAuditContext({ userId, batchId }, async () => {
    for (const row of validatedRows) {
      const { id, ...data } = row as { id?: number } & Record<string, unknown>;

      if (id) {
        const existing = await model.findFirst({ where: { id, user_id: userId } });
        if (existing) {
          if (mode === 'overwrite') {
            if (entity === 'transactions' && existing.transfer_id != null) {
              throw new Error('Unlink the reconciled payment before overwriting it');
            }
            const where = {
              id, user_id: userId,
              ...(entity === 'transactions' ? { transfer_id: null,
                ...((existing.type !== data.type || existing.account_id !== data.account_id) ? { other_transactions: { none: { deleted_at: null } } } : {}),
              } : {}),
              ...(entity === 'transfers' ? { transactions: { none: { deleted_at: null } } } : {}),
            };
            await model.update({ where, data });
            updated++;
          } else {
            skipped++;
          }
          continue;
        }
      }

      const inserted = await model.create({ data: { ...data, user_id: userId } });
      if (inserted && typeof inserted.id === 'number') {
        insertedIds.push(inserted.id);
      }
      created++;
    }
  });

  return { created, updated, skipped, insertedIds };
}
