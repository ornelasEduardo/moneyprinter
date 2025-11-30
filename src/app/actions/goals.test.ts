import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPrimaryGoal, updatePrimaryGoal, getEmergencyFundAmount, updateEmergencyFundAmount } from './goals';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/action-middleware';
import { revalidatePath } from 'next/cache';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    goals: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    user_settings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@/lib/action-middleware', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Goal Actions', () => {
  const mockUserId = 123;

  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(mockUserId);
  });

  describe('getPrimaryGoal', () => {
    it('should return primary goal', async () => {
      (prisma.goals.findFirst as any).mockResolvedValue({
        id: 1,
        name: 'House',
        target_amount: 100000,
        current_amount: 50000,
      });

      const goal = await getPrimaryGoal();
      expect(goal).toEqual({
        id: 1,
        name: 'House',
        target_amount: 100000,
        current_amount: 50000,
      });
    });
  });

  describe('updatePrimaryGoal', () => {
    it('should update existing goal', async () => {
      (prisma.goals.findFirst as any).mockResolvedValue({ id: 1 });

      await updatePrimaryGoal('New House', 200000);

      expect(prisma.goals.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'New House', target_amount: 200000 },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });

    it('should create new goal if none exists', async () => {
      (prisma.goals.findFirst as any).mockResolvedValue(null);

      await updatePrimaryGoal('New House', 200000);

      expect(prisma.goals.create).toHaveBeenCalledWith({
        data: {
          user_id: mockUserId,
          name: 'New House',
          target_amount: 200000,
          is_primary: true,
          current_amount: 0,
        },
      });
    });
  });

  describe('getEmergencyFundAmount', () => {
    it('should return amount', async () => {
      (prisma.user_settings.findUnique as any).mockResolvedValue({ value: '10000' });
      const amount = await getEmergencyFundAmount();
      expect(amount).toBe(10000);
    });

    it('should return 0 if not set', async () => {
      (prisma.user_settings.findUnique as any).mockResolvedValue(null);
      const amount = await getEmergencyFundAmount();
      expect(amount).toBe(0);
    });
  });

  describe('updateEmergencyFundAmount', () => {
    it('should upsert amount', async () => {
      await updateEmergencyFundAmount(15000);

      expect(prisma.user_settings.upsert).toHaveBeenCalledWith({
        where: {
          user_id_key: { user_id: mockUserId, key: 'emergency_fund_amount' },
        },
        update: { value: '15000' },
        create: {
          user_id: mockUserId,
          key: 'emergency_fund_amount',
          value: '15000',
        },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });
  });
});
