import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNetWorthEntry, updateNetWorthEntry, deleteNetWorthEntry, getNetWorthHistory } from './networth';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/action-middleware';
import { revalidatePath } from 'next/cache';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    net_worth_history: {
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/action-middleware', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Net Worth Actions', () => {
  const mockUserId = 123;

  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(mockUserId);
  });

  describe('createNetWorthEntry', () => {
    it('should create entry', async () => {
      const formData = new FormData();
      formData.append('date', '2024-01-01');
      formData.append('netWorth', '10000');

      await createNetWorthEntry(formData);

      expect(prisma.net_worth_history.create).toHaveBeenCalledWith({
        data: {
          user_id: mockUserId,
          date: new Date('2024-01-01'),
          net_worth: 10000,
        },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });
  });

  describe('updateNetWorthEntry', () => {
    it('should update entry', async () => {
      const formData = new FormData();
      formData.append('date', '2024-01-02');
      formData.append('netWorth', '11000');

      (prisma.net_worth_history.findFirst as any).mockResolvedValue({ id: 1 });

      await updateNetWorthEntry(1, formData);

      expect(prisma.net_worth_history.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          date: new Date('2024-01-02'),
          net_worth: 11000,
        },
      });
    });
  });

  describe('deleteNetWorthEntry', () => {
    it('should delete entry', async () => {
      (prisma.net_worth_history.deleteMany as any).mockResolvedValue({ count: 1 });

      await deleteNetWorthEntry(1);

      expect(prisma.net_worth_history.deleteMany).toHaveBeenCalledWith({
        where: { id: 1, user_id: mockUserId },
      });
    });
  });

  describe('getNetWorthHistory', () => {
    it('should return history', async () => {
      (prisma.net_worth_history.findMany as any).mockResolvedValue([
        { id: 1, date: new Date('2024-01-01'), net_worth: 10000 },
      ]);

      const history = await getNetWorthHistory();

      expect(history).toEqual([
        { id: 1, date: '2024-01-01', netWorth: 10000 },
      ]);
    });
  });
});
