'use server';

import { requireAuth } from '@/lib/action-middleware';
import { restoreSnapshot } from '@/lib/restore';
import { revalidatePath } from 'next/cache';

export async function restoreBackupAction(snapshot: unknown) {
  const userId = await requireAuth();
  const result = await restoreSnapshot(userId, snapshot);
  revalidatePath('/');
  return result;
}
