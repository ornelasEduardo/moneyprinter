'use server';

import { requireAuth } from '@/lib/action-middleware';
import { estimateBackupSize, shouldShowReminder, type BackupHistoryEntry } from '@/lib/backup';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

async function getSetting(userId: number, key: string): Promise<string | null> {
  const setting = await prisma.user_settings.findUnique({
    where: { user_id_key: { user_id: userId, key } },
    select: { value: true },
  });
  return setting?.value ?? null;
}

async function setSetting(userId: number, key: string, value: string): Promise<void> {
  await prisma.user_settings.upsert({
    where: { user_id_key: { user_id: userId, key } },
    update: { value },
    create: { user_id: userId, key, value },
  });
}

export async function getBackupEstimate() {
  const userId = await requireAuth();
  return estimateBackupSize(userId);
}

export async function getBackupReminderState() {
  const userId = await requireAuth();
  const lastBackupDate = await getSetting(userId, 'backup_last_date');
  const dismissedAt = await getSetting(userId, 'backup_reminder_dismissed_at');
  const intervalStr = await getSetting(userId, 'backup_reminder_interval');
  const interval = intervalStr ? parseInt(intervalStr) : 30;

  return {
    show: shouldShowReminder(lastBackupDate, dismissedAt, interval),
    lastBackupDate,
    intervalDays: interval,
  };
}

export async function dismissBackupReminder() {
  const userId = await requireAuth();
  await setSetting(userId, 'backup_reminder_dismissed_at', new Date().toISOString());
  revalidatePath('/');
}

export async function recordBackup(entry: BackupHistoryEntry) {
  const userId = await requireAuth();
  const historyStr = await getSetting(userId, 'backup_history');
  const history: BackupHistoryEntry[] = historyStr ? JSON.parse(historyStr) : [];
  history.unshift(entry);
  const trimmed = history.slice(0, 20);
  await setSetting(userId, 'backup_history', JSON.stringify(trimmed));
  await setSetting(userId, 'backup_last_date', entry.date);
  await setSetting(userId, 'backup_reminder_dismissed_at', '');
  revalidatePath('/');
}

export async function getBackupHistory(): Promise<BackupHistoryEntry[]> {
  const userId = await requireAuth();
  const historyStr = await getSetting(userId, 'backup_history');
  return historyStr ? JSON.parse(historyStr) : [];
}
