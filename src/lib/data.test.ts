import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getNetWorth, 
  getAccounts, 
  getMonthlySpending, 
  getNetWorthHistory,
  calculateMonthlyNetWorthIncrease 
} from './data';
import prisma from '@/lib/prisma';
import { getCurrentUser } from './auth';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    accounts: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    transactions: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    net_worth_history: {
      findMany: vi.fn(),
    },
    income_sources: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    income_budgets: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

vi.mock('./auth', () => ({
  getCurrentUser: vi.fn(),
}));

describe('Data Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNetWorth', () => {
    it('should return 0 if no user', async () => {
      (getCurrentUser as any).mockResolvedValue(null);
      const result = await getNetWorth();
      expect(result).toBe(0);
    });

    it('should return sum of account balances', async () => {
      (getCurrentUser as any).mockResolvedValue(1);
      (prisma.accounts.aggregate as any).mockResolvedValue({
        _sum: { balance: 1000 },
      });

      const result = await getNetWorth();
      expect(result).toBe(1000);
      expect(prisma.accounts.aggregate).toHaveBeenCalledWith({
        where: { user_id: 1 },
        _sum: { balance: true },
      });
    });

    it('should return 0 if aggregate returns null', async () => {
      (getCurrentUser as any).mockResolvedValue(1);
      (prisma.accounts.aggregate as any).mockResolvedValue({
        _sum: { balance: null },
      });

      const result = await getNetWorth();
      expect(result).toBe(0);
    });
  });

  describe('getAccounts', () => {
    it('should return empty array if no user', async () => {
      (getCurrentUser as any).mockResolvedValue(null);
      const result = await getAccounts();
      expect(result).toEqual([]);
    });

    it('should return formatted accounts', async () => {
      (getCurrentUser as any).mockResolvedValue(1);
      const mockDate = new Date('2024-01-01');
      (prisma.accounts.findMany as any).mockResolvedValue([
        {
          id: 1,
          name: 'Test Bank',
          type: 'checking',
          balance: 1000,
          currency: 'USD',
          last_updated: mockDate,
        },
      ]);

      const result = await getAccounts();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        name: 'Test Bank',
        type: 'checking',
        balance: 1000,
        currency: 'USD',
        last_updated: mockDate.toISOString(),
      });
    });
  });

  describe('getMonthlySpending', () => {
    it('should return 0 if no user', async () => {
      (getCurrentUser as any).mockResolvedValue(null);
      const result = await getMonthlySpending();
      expect(result).toBe(0);
    });

    it('should return sum of transactions', async () => {
      (getCurrentUser as any).mockResolvedValue(1);
      (prisma.transactions.aggregate as any).mockResolvedValue({
        _sum: { amount: 500 },
      });

      const result = await getMonthlySpending();
      expect(result).toBe(500);
    });
  });

  describe('calculateMonthlyNetWorthIncrease', () => {
    it('should return 0 if no user', async () => {
      (getCurrentUser as any).mockResolvedValue(null);
      const result = await calculateMonthlyNetWorthIncrease();
      expect(result).toBe(0);
    });

    it('should return 0 if no paycheck income source', async () => {
      (getCurrentUser as any).mockResolvedValue(1);
      (prisma.income_sources.findFirst as any).mockResolvedValue(null);
      
      const result = await calculateMonthlyNetWorthIncrease();
      expect(result).toBe(0);
    });

    it('should calculate increase based on percentage budgets', async () => {
      (getCurrentUser as any).mockResolvedValue(1);
      (prisma.income_sources.findFirst as any).mockResolvedValue({
        id: 1,
        amount: 2000,
        frequency: 'monthly',
      });
      (prisma.income_budgets.findMany as any).mockResolvedValue([
        { unit: 'percentage', value: 10 }, // 10% of 2000 = 200
        { unit: 'percentage', value: 20 }, // 20% of 2000 = 400
      ]);

      const result = await calculateMonthlyNetWorthIncrease();
      // Total per paycheck = 600. Monthly frequency = 1 paycheck/month.
      expect(result).toBe(600);
    });

    it('should calculate increase based on fixed budgets', async () => {
      (getCurrentUser as any).mockResolvedValue(1);
      (prisma.income_sources.findFirst as any).mockResolvedValue({
        id: 1,
        amount: 2000,
        frequency: 'bi-weekly',
      });
      (prisma.income_budgets.findMany as any).mockResolvedValue([
        { unit: 'currency', value: 100 },
        { unit: 'currency', value: 200 },
      ]);

      const result = await calculateMonthlyNetWorthIncrease();
      // Total per paycheck = 300. Bi-weekly frequency = 2.17 paychecks/month.
      // 300 * 2.17 = 651
      expect(result).toBeCloseTo(651);
    });
  });
});
