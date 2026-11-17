'use server';

import { requireAuth } from '@/lib/action-middleware';
import { getAuditLog, undoAuditEntry, undoBatch } from '@/lib/audit';
import { revalidatePath } from 'next/cache';

export async function getRecentAuditLog(params?: {
  entityType?: string;
  limit?: number;
  offset?: number;
}) {
  const userId = await requireAuth();

  return getAuditLog({
    userId,
    entityType: params?.entityType,
    limit: params?.limit ?? 50,
    offset: params?.offset ?? 0,
  });
}

export async function undoEntry(entryId: number) {
  const userId = await requireAuth();

  await undoAuditEntry(entryId, userId);
  revalidatePath('/');
  revalidatePath('/history');
}

export async function undoEntryBatch(batchId: string) {
  const userId = await requireAuth();

  await undoBatch(batchId, userId);
  revalidatePath('/');
  revalidatePath('/history');
}
