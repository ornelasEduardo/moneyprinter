import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createIncomeSource } from './income';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/action-middleware';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    income_sources: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/action-middleware', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('Income Actions', () => {
  const mockUserId = 123;

  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(mockUserId);
  });

  describe('createIncomeSource', () => {
    it('should create income source', async () => {
      const formData = new FormData();
      formData.append('name', 'Job');
      formData.append('amount', '5000');
      formData.append('frequency', 'monthly');
      formData.append('next_date', '2024-01-01');
      formData.append('type', 'paycheck');

      await createIncomeSource(formData);

      expect(prisma.income_sources.create).toHaveBeenCalledWith({
        data: {
          user_id: mockUserId,
          name: 'Job',
          amount: 5000,
          frequency: 'monthly',
          next_date: new Date('2024-01-01'),
          type: 'paycheck',
        },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/');
      expect(redirect).toHaveBeenCalledWith('/?tab=budget');
    });

    it('should throw on invalid data', async () => {
      const formData = new FormData();
      // Missing required fields

      await expect(createIncomeSource(formData)).rejects.toThrow('Invalid form data');
    });
  });
});
