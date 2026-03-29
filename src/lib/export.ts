import prisma from '@/lib/prisma';
import Papa from 'papaparse';

export const EXPORTABLE_ENTITIES = [
  'accounts',
  'transactions',
  'net_worth_history',
  'income_sources',
  'income_budgets',
  'budget_limits',
  'goals',
  'user_settings',
] as const;

export type ExportableEntity = (typeof EXPORTABLE_ENTITIES)[number];

const EXCLUDE_FIELDS = ['user_id', 'deleted_at'];

function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const serialized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (EXCLUDE_FIELDS.includes(key)) continue;
    if (value instanceof Date) {
      serialized[key] = value.toISOString();
    } else if (typeof value === 'object' && value !== null && 'toNumber' in value) {
      serialized[key] = (value as { toNumber: () => number }).toNumber();
    } else {
      serialized[key] = value;
    }
  }
  return serialized;
}

export async function exportEntity(userId: number, entity: string): Promise<Record<string, unknown>[]> {
  if (!EXPORTABLE_ENTITIES.includes(entity as ExportableEntity)) {
    throw new Error(`Unknown entity: ${entity}`);
  }

  const model = (prisma as any)[entity];
  const where: Record<string, unknown> = { user_id: userId };

  const softDeleteEntities = ['accounts', 'transactions', 'net_worth_history', 'income_sources'];
  if (softDeleteEntities.includes(entity)) {
    where.deleted_at = null;
  }

  const rows = await model.findMany({ where });
  return rows.map((row: Record<string, unknown>) => serializeRow(row));
}

export async function exportEntityCsv(userId: number, entity: string): Promise<string> {
  const data = await exportEntity(userId, entity);
  return Papa.unparse(data);
}

export async function exportAllEntities(userId: number): Promise<Record<string, Record<string, unknown>[]>> {
  const result: Record<string, Record<string, unknown>[]> = {};
  for (const entity of EXPORTABLE_ENTITIES) {
    result[entity] = await exportEntity(userId, entity);
  }
  return result;
}

export function buildMetadata(
  type: 'export' | 'backup',
  entityData: Record<string, Record<string, unknown>[]>,
  checksums?: Record<string, string>,
): Record<string, unknown> {
  const entities: Record<string, { count: number }> = {};
  for (const [name, rows] of Object.entries(entityData)) {
    entities[name] = { count: rows.length };
  }

  return {
    version: 1,
    type,
    exported_at: new Date().toISOString(),
    app_version: '0.1.0',
    entities,
    ...(checksums ? { checksums } : {}),
  };
}
