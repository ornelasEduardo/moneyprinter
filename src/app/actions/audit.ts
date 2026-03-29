'use server';

import { requireAuth } from '@/lib/action-middleware';
import { getAuditLog, undoAuditEntry, undoBatch } from '@/lib/audit';
import { revalidatePath } from 'next/cache';

export async function getRecentAuditLog(params?: {
  entityType?: string;
  limit?: number;
  offset?: number;
}) {
  await requireAuth();

  return getAuditLog({
    entityType: params?.entityType,
    limit: params?.limit ?? 50,
    offset: params?.offset ?? 0,
  });
}

export async function undoEntry(entryId: number) {
  await requireAuth();

  await undoAuditEntry(entryId);
  revalidatePath('/');
  revalidatePath('/history');
}

export async function undoEntryBatch(batchId: string) {
  await requireAuth();

  await undoBatch(batchId);
  revalidatePath('/');
  revalidatePath('/history');
}
