import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBackupEstimate } from './backup';
import { requireAuth } from '@/lib/action-middleware';

vi.mock('@/lib/action-middleware', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    accounts: { count: vi.fn().mockResolvedValue(5) },
    transactions: { count: vi.fn().mockResolvedValue(100) },
    net_worth_history: { count: vi.fn().mockResolvedValue(30) },
    income_sources: { count: vi.fn().mockResolvedValue(2) },
    income_budgets: { count: vi.fn().mockResolvedValue(10) },
    budget_limits: { count: vi.fn().mockResolvedValue(4) },
    goals: { count: vi.fn().mockResolvedValue(1) },
    user_settings: { count: vi.fn().mockResolvedValue(3) },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('getBackupEstimate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(1);
  });

  it('should return size estimate with entity counts', async () => {
    const estimate = await getBackupEstimate();
    expect(estimate.totalRows).toBeGreaterThan(0);
    expect(estimate.estimatedBytes).toBeGreaterThan(0);
    expect(estimate.entities.accounts).toBe(5);
  });
});
