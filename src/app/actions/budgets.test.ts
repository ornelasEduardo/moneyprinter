import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveIncomeBudgets, getIncomeBudgets, getIncomeSources } from './budgets';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/action-middleware';
import { revalidatePath } from 'next/cache';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: vi.fn((callback) => callback(prisma)),
    income_sources: {
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    income_budgets: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

vi.mock('@/lib/action-middleware', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Budget Actions', () => {
  const mockUserId = 123;

  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(mockUserId);
  });

  describe('saveIncomeBudgets', () => {
    it('should save budgets', async () => {
      const budgets = [
        { name: 'Savings', unit: 'percentage' as const, value: 20, type: 'savings' as const, increasesNetWorth: true },
      ];

      await saveIncomeBudgets(1, 5000, budgets);

      expect(prisma.income_budgets.deleteMany).toHaveBeenCalledWith({
        where: { income_source_id: 1, user_id: mockUserId },
      });
      expect(prisma.income_sources.updateMany).toHaveBeenCalledWith({
        where: { id: 1, user_id: mockUserId },
        data: { amount: 5000 },
      });
      expect(prisma.income_budgets.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'Savings', value: 20 }),
        ]),
      });
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });
  });

  describe('getIncomeBudgets', () => {
    it('should return budgets', async () => {
      (prisma.income_budgets.findMany as any).mockResolvedValue([
        { id: 1, name: 'Savings', unit: 'percentage', value: 20, type: 'savings', increases_net_worth: true },
      ]);

      const budgets = await getIncomeBudgets(1);

      expect(budgets).toEqual([
        { id: '1', name: 'Savings', unit: 'percentage', value: 20, type: 'savings', increasesNetWorth: true },
      ]);
    });
  });

  describe('getIncomeSources', () => {
    it('should return sources', async () => {
      (prisma.$queryRaw as any).mockResolvedValue([
        { id: 1, name: 'Job', type: 'paycheck', amount: 5000 },
      ]);

      const sources = await getIncomeSources();

      expect(sources).toEqual([
        { id: 1, name: 'Job', type: 'paycheck', amount: 5000 },
      ]);
    });
  });
});
