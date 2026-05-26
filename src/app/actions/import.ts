'use server';

import { requireAuth } from '@/lib/action-middleware';
import { parseCsvEntity, validateRows, detectConflicts, commitImport } from '@/lib/import';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { applyRulesAtCreate, type CompiledRule } from '@/lib/tagging';
import type { Filter } from 'doom-design-system/filter';

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

  if (entity === 'transactions' && result.insertedIds.length > 0) {
    const ruleRows = await prisma.categorization_rules.findMany({
      where: { user_id: userId, enabled: true, deleted_at: null },
      orderBy: { priority: 'desc' },
    });
    const rules: CompiledRule[] = ruleRows.map((r) => ({
      id: r.id,
      priority: r.priority,
      conditions: r.conditions as unknown as Filter,
      actions: r.actions as unknown as CompiledRule['actions'],
    }));
    for (const id of result.insertedIds) {
      await applyRulesAtCreate({ transactionId: id, userId, rules });
    }
  }

  revalidatePath('/');
  return result;
}
