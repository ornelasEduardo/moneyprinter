import prisma from '@/lib/prisma';
import { EXPORTABLE_ENTITIES } from '@/lib/constants';
import { createHash } from 'node:crypto';

const AVG_ROW_BYTES: Record<string, number> = {
  accounts: 200,
  transactions: 250,
  net_worth_history: 100,
  income_sources: 200,
  income_budgets: 200,
  budget_limits: 100,
  goals: 150,
  user_settings: 100,
};

export interface BackupSizeEstimate {
  totalRows: number;
  estimatedBytes: number;
  entities: Record<string, number>;
}

export type { BackupHistoryEntry } from '@/lib/constants';

export async function estimateBackupSize(userId: number): Promise<BackupSizeEstimate> {
  const entities: Record<string, number> = {};
  let totalRows = 0;
  let estimatedBytes = 0;

  for (const entity of EXPORTABLE_ENTITIES) {
    const model = (prisma as any)[entity];
    const where: Record<string, unknown> = { user_id: userId };
    const softDeleteEntities = ['accounts', 'transactions', 'net_worth_history', 'income_sources'];
    if (softDeleteEntities.includes(entity)) {
      where.deleted_at = null;
    }
    const count = await model.count({ where });
    entities[entity] = count;
    totalRows += count;
    estimatedBytes += count * (AVG_ROW_BYTES[entity] || 150);
  }

  estimatedBytes = Math.round(estimatedBytes * 0.7) + 1024;

  return { totalRows, estimatedBytes, entities };
}

export function computeChecksum(data: string): string {
  return `sha256:${createHash('sha256').update(data).digest('hex')}`;
}

export function shouldShowReminder(
  lastBackupDate: string | null,
  dismissedAt: string | null,
  intervalDays: number,
): boolean {
  if (!lastBackupDate) return true;

  const now = new Date();
  const lastBackup = new Date(lastBackupDate);
  const daysSinceBackup = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceBackup <= intervalDays) return false;

  if (dismissedAt) {
    const dismissed = new Date(dismissedAt);
    const daysSinceDismiss = (now.getTime() - dismissed.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDismiss <= intervalDays) return false;
  }

  return true;
}

export { formatBytes } from '@/lib/constants';
