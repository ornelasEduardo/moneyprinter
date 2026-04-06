import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/action-middleware', () => ({
  requireAuth: vi.fn().mockResolvedValue(1),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    transactions: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { getSpendingByCategory, getCashFlow, getRecurringCharges } from './analytics';
import prisma from '@/lib/prisma';

describe('Analytics Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSpendingByCategory should query transactions and return aggregated data', async () => {
    (prisma.transactions.findMany as any).mockResolvedValue([
      { id: 1, name: 'Food', amount: 50, date: new Date('2026-03-01'), type: 'expense', tags: 'Groceries', account_id: 1, accounts: null },
    ]);

    const result = await getSpendingByCategory(
      new Date('2026-03-01'),
      new Date('2026-03-31'),
    );

    expect(prisma.transactions.findMany).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('groceries');
  });

  it('getCashFlow should return period-based income and expenses', async () => {
    (prisma.transactions.findMany as any).mockResolvedValue([
      { id: 1, name: 'Pay', amount: 3200, date: new Date('2026-03-15'), type: 'income', tags: null, account_id: 1, accounts: null },
      { id: 2, name: 'Rent', amount: 1500, date: new Date('2026-03-01'), type: 'expense', tags: 'Housing', account_id: 1, accounts: null },
    ]);

    const result = await getCashFlow(
      new Date('2026-03-01'),
      new Date('2026-03-31'),
      'month',
    );

    expect(result).toHaveLength(1);
    expect(result[0].income).toBe(3200);
    expect(result[0].expenses).toBe(1500);
  });

  it('getRecurringCharges should detect patterns', async () => {
    const monthly = Array.from({ length: 4 }, (_, i) => ({
      id: i + 1,
      name: 'Netflix',
      amount: 15.99,
      date: new Date(2026, i, 3),
      type: 'expense',
      tags: null,
      account_id: 1,
      accounts: null,
    }));
    (prisma.transactions.findMany as any).mockResolvedValue(monthly);

    const result = await getRecurringCharges(
      new Date('2026-01-01'),
      new Date('2026-04-30'),
    );

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].name).toBe('netflix');
    expect(result[0].frequency).toBe('monthly');
  });
});
