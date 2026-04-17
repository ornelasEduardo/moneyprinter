import { describe, it, expect, vi, beforeEach } from 'vitest';
import { estimateBackupSize, shouldShowReminder } from './backup';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  default: {
    accounts: { count: vi.fn() },
    transactions: { count: vi.fn() },
    net_worth_history: { count: vi.fn() },
    income_sources: { count: vi.fn() },
    income_budgets: { count: vi.fn() },
    budget_limits: { count: vi.fn() },
    goals: { count: vi.fn() },
    user_settings: { count: vi.fn() },
    transfers: { count: vi.fn() },
  },
}));

describe('estimateBackupSize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should estimate size based on row counts', async () => {
    (prisma.accounts.count as any).mockResolvedValue(10);
    (prisma.transactions.count as any).mockResolvedValue(500);
    (prisma.net_worth_history.count as any).mockResolvedValue(365);
    (prisma.income_sources.count as any).mockResolvedValue(3);
    (prisma.income_budgets.count as any).mockResolvedValue(15);
    (prisma.budget_limits.count as any).mockResolvedValue(8);
    (prisma.goals.count as any).mockResolvedValue(2);
    (prisma.user_settings.count as any).mockResolvedValue(5);
    ((prisma as any).transfers.count as any).mockResolvedValue(0);

    const estimate = await estimateBackupSize(1);

    expect(estimate.totalRows).toBe(908);
    expect(estimate.estimatedBytes).toBeGreaterThan(0);
    expect(estimate.entities.accounts).toBe(10);
    expect(estimate.entities.transactions).toBe(500);
  });
});

describe('shouldShowReminder', () => {
  it('should return true if no backup has ever been taken', () => {
    expect(shouldShowReminder(null, null, 30)).toBe(true);
  });

  it('should return true if backup is older than interval', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 31);
    expect(shouldShowReminder(oldDate.toISOString(), null, 30)).toBe(true);
  });

  it('should return false if backup is recent', () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 5);
    expect(shouldShowReminder(recentDate.toISOString(), null, 30)).toBe(false);
  });

  it('should return false if reminder was recently dismissed', () => {
    const oldBackup = new Date();
    oldBackup.setDate(oldBackup.getDate() - 31);
    const recentDismiss = new Date();
    recentDismiss.setDate(recentDismiss.getDate() - 5);
    expect(shouldShowReminder(oldBackup.toISOString(), recentDismiss.toISOString(), 30)).toBe(false);
  });

  it('should return true if dismiss is also older than interval', () => {
    const oldBackup = new Date();
    oldBackup.setDate(oldBackup.getDate() - 60);
    const oldDismiss = new Date();
    oldDismiss.setDate(oldDismiss.getDate() - 31);
    expect(shouldShowReminder(oldBackup.toISOString(), oldDismiss.toISOString(), 30)).toBe(true);
  });
});
