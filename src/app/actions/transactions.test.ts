import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTransaction, deleteTransaction, updateTransaction, getAccounts } from './transactions';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/action-middleware';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    transactions: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    accounts: {
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

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('Transaction Actions', () => {
  const mockUserId = 123;

  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(mockUserId);
  });

  describe('createTransaction', () => {
    it('should create a transaction and redirect', async () => {
      const formData = new FormData();
      formData.append('name', 'Groceries');
      formData.append('amount', '150.50');
      formData.append('date', '2024-01-01');
      formData.append('accountId', '1');
      formData.append('type', 'expense');

      // Mock account check
      (prisma.accounts.findFirst as any).mockResolvedValue({ id: 1, user_id: mockUserId });

      await createTransaction(formData);

      expect(prisma.accounts.findFirst).toHaveBeenCalledWith({
        where: { id: 1, user_id: mockUserId },
      });

      expect(prisma.transactions.create).toHaveBeenCalledWith({
        data: {
          user_id: mockUserId,
          name: 'Groceries',
          amount: 150.50,
          date: new Date('2024-01-01'),
          tags: null,
          account_id: 1,
          type: 'expense',
          pending: false,
        },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/');
      expect(redirect).toHaveBeenCalledWith('/?tab=transactions');
    });

    it('should throw if account does not exist', async () => {
      const formData = new FormData();
      formData.append('name', 'Groceries');
      formData.append('amount', '150.50');
      formData.append('date', '2024-01-01');
      formData.append('accountId', '999');

      (prisma.accounts.findFirst as any).mockResolvedValue(null);

      await expect(createTransaction(formData)).rejects.toThrow('Failed to create transaction');
    });
  });

  describe('updateTransaction', () => {
    it('should update a transaction', async () => {
      const formData = new FormData();
      formData.append('name', 'Updated Groceries');
      formData.append('amount', '200');
      formData.append('date', '2024-01-02');
      formData.append('accountId', '1');

      // Mock transaction check
      (prisma.transactions.findFirst as any).mockResolvedValue({ id: 1, user_id: mockUserId });
      // Mock account check
      (prisma.accounts.findFirst as any).mockResolvedValue({ id: 1, user_id: mockUserId });

      await updateTransaction(1, formData);

      expect(prisma.transactions.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          name: 'Updated Groceries',
          amount: 200,
        }),
      });
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });
  });

  describe('deleteTransaction', () => {
    it('should delete a transaction', async () => {
      (prisma.transactions.deleteMany as any).mockResolvedValue({ count: 1 });

      await deleteTransaction(1);

      expect(prisma.transactions.deleteMany).toHaveBeenCalledWith({
        where: { id: 1, user_id: mockUserId },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });

    it('should throw if transaction not found', async () => {
      (prisma.transactions.deleteMany as any).mockResolvedValue({ count: 0 });

      await expect(deleteTransaction(1)).rejects.toThrow('Failed to delete transaction');
    });
  });

  describe('getAccounts', () => {
    it('should return accounts list', async () => {
      const mockAccounts = [{ id: 1, name: 'Bank' }];
      (prisma.accounts.findMany as any).mockResolvedValue(mockAccounts);

      const result = await getAccounts();

      expect(prisma.accounts.findMany).toHaveBeenCalledWith({
        where: { user_id: mockUserId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      });
      expect(result).toEqual(mockAccounts);
    });
  });
});
