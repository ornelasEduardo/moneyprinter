'use server';

import { requireAuth } from '@/lib/action-middleware';
import { parseCsvEntity, validateRows, detectConflicts, commitImport } from '@/lib/import';
import { revalidatePath } from 'next/cache';

export async function validateImport(entity: string, csvContent: string) {
  const userId = await requireAuth();
  const rows = parseCsvEntity(csvContent);
  const validation = validateRows(entity, rows);
  const conflicts = await detectConflicts(userId, entity, validation.valid);
  return { validation, conflicts };
}

export async function commitImportAction(
  entity: string,
  rows: Record<string, unknown>[],
  mode: 'skip' | 'overwrite',
) {
  const userId = await requireAuth();
  const result = await commitImport(userId, entity, rows, mode);
  revalidatePath('/');
  return result;
}
