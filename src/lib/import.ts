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
): Promise<{ created: number; updated: number; skipped: number }> {
  if (!EXPORTABLE_ENTITIES.includes(entity as ExportableEntity)) {
    throw new Error(`Unknown entity: ${entity}`);
  }

  const model = (prisma as any)[entity];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  const batchId = randomUUID();

  await withAuditContext({ userId, batchId }, async () => {
    for (const row of rows) {
      const { id, ...data } = row as { id?: number } & Record<string, unknown>;

      if (id) {
        const existing = await model.findFirst({ where: { id, user_id: userId } });
        if (existing) {
          if (mode === 'overwrite') {
            await model.update({ where: { id }, data });
            updated++;
          } else {
            skipped++;
          }
          continue;
        }
      }

      await model.create({ data: { ...data, user_id: userId } });
      created++;
    }
  });

  return { created, updated, skipped };
}
