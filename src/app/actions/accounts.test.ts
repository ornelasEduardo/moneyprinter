import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAccount, deleteAccount, updateAccount, updateAccountBalance } from './accounts';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/action-middleware';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    accounts: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
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

describe('Account Actions', () => {
  const mockUserId = 123;

  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(mockUserId);
  });

  describe('createAccount', () => {
    it('should create an account and redirect', async () => {
      const formData = new FormData();
      formData.append('name', 'Test Account');
      formData.append('type', 'checking');
      formData.append('balance', '1000');
      formData.append('currency', 'USD');

      await createAccount(formData);

      expect(prisma.accounts.create).toHaveBeenCalledWith({
        data: {
          user_id: mockUserId,
          name: 'Test Account',
          type: 'checking',
          balance: 1000,
          currency: 'USD',
        },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/');
      expect(redirect).toHaveBeenCalledWith('/?tab=accounts');
    });

    it('should throw error for invalid data', async () => {
      const formData = new FormData();
      // Missing name and type

      await expect(createAccount(formData)).rejects.toThrow('Invalid form data');
    });
  });

  describe('deleteAccount', () => {
    it('should delete an account', async () => {
      await deleteAccount(1);

      expect(prisma.accounts.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 1,
          user_id: mockUserId,
        },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });
  });

  describe('updateAccount', () => {
    it('should update an account', async () => {
      const formData = new FormData();
      formData.append('name', 'Updated Name');
      formData.append('type', 'savings');
      formData.append('balance', '2000');

      (prisma.accounts.updateMany as any).mockResolvedValue({ count: 1 });

      await updateAccount(1, formData);

      expect(prisma.accounts.updateMany).toHaveBeenCalledWith({
        where: {
          id: 1,
          user_id: mockUserId,
        },
        data: expect.objectContaining({
          name: 'Updated Name',
          type: 'savings',
          balance: 2000,
          currency: 'USD', // Default
        }),
      });
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });

    it('should throw if account not found', async () => {
      const formData = new FormData();
      formData.append('name', 'Updated Name');
      formData.append('type', 'savings');
      formData.append('balance', '2000');

      (prisma.accounts.updateMany as any).mockResolvedValue({ count: 0 });

      await expect(updateAccount(1, formData)).rejects.toThrow('Failed to update account');
    });
  });
  
  describe('updateAccountBalance', () => {
    it('should update balance', async () => {
      (prisma.accounts.updateMany as any).mockResolvedValue({ count: 1 });
      
      await updateAccountBalance(1, 5000);
      
      expect(prisma.accounts.updateMany).toHaveBeenCalledWith({
        where: { id: 1, user_id: mockUserId },
        data: expect.objectContaining({ balance: 5000 })
      });
    });
  });
});
