import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: {
    accounts: { aggregate: vi.fn(), findMany: vi.fn() },
    transactions: { findMany: vi.fn() },
  },
}));

import prisma from '@/lib/prisma';
import { liquidBalance, netWorth, monthlyIncome, monthlySurplus } from './signals';

describe('signals', () => {
  it('liquidBalance sums only checking + savings balances', async () => {
    (prisma.accounts.aggregate as any).mockResolvedValue({ _sum: { balance: 4200 } });
    const v = await liquidBalance.load(2);
    expect(v).toBe(4200);
    expect((prisma.accounts.aggregate as any).mock.calls[0][0].where.type.in).toEqual(['checking', 'savings']);
  });

  it('netWorth sums all non-deleted balances', async () => {
    (prisma.accounts.aggregate as any).mockResolvedValue({ _sum: { balance: 90000 } });
    expect(await netWorth.load(2)).toBe(90000);
  });

  it('monthlyIncome averages income over the trailing window', async () => {
    (prisma.transactions.findMany as any).mockResolvedValue([
      { amount: 6000, type: 'income', date: new Date('2026-08-01') },
      { amount: 6000, type: 'income', date: new Date('2026-07-01') },
      { amount: 3000, type: 'expense', date: new Date('2026-08-02') },
    ]);
    // 12000 income / 6 months
    expect(await monthlyIncome.load(2)).toBe(2000);
  });

  it('monthlySurplus averages net (income - expense) over the window', async () => {
    (prisma.transactions.findMany as any).mockResolvedValue([
      { amount: 12000, type: 'income', date: new Date('2026-08-01') },
      { amount: 6000, type: 'expense', date: new Date('2026-08-02') },
    ]);
    // (12000 - 6000) / 6
    expect(await monthlySurplus.load(2)).toBe(1000);
  });
});
