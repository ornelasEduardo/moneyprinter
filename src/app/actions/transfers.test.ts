import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTransfer, updateTransfer } from './transfers';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/action-middleware';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/prisma', () => ({
  default: {
    accounts: { findMany: vi.fn() },
    transfers: { create: vi.fn() },
  },
}));
vi.mock('@/lib/action-middleware', () => ({ requireAuth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

describe('createTransfer', () => {
  const mockUserId = 42;

  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(mockUserId);
  });

  function fd(overrides: Record<string, string> = {}) {
    const f = new FormData();
    f.append('fromAccountId', '1');
    f.append('toAccountId', '2');
    f.append('amount', '250.00');
    f.append('transferDate', '2026-04-16');
    f.append('note', 'Monthly savings sweep');
    f.append('tags', 'savings');
    for (const [k, v] of Object.entries(overrides)) f.append(k, v);
    return f;
  }

  it('creates a transfer when both accounts belong to the user and share currency', async () => {
    (prisma.accounts.findMany as any).mockResolvedValue([
      { id: 1, user_id: mockUserId, currency: 'USD', deleted_at: null },
      { id: 2, user_id: mockUserId, currency: 'USD', deleted_at: null },
    ]);

    await createTransfer(fd());

    expect(prisma.transfers.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user_id: mockUserId,
        from_account_id: 1,
        to_account_id: 2,
        amount: 250.0,
        note: 'Monthly savings sweep',
        tags: 'savings',
      }),
    });
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });

  it('rejects when from and to are the same account', async () => {
    (prisma.accounts.findMany as any).mockResolvedValue([
      { id: 1, user_id: mockUserId, currency: 'USD', deleted_at: null },
    ]);
    await expect(createTransfer(fd({ fromAccountId: '1', toAccountId: '1' })))
      .rejects.toThrow(/differ/i);
    expect(prisma.transfers.create).not.toHaveBeenCalled();
  });

  it('rejects non-positive amount', async () => {
    await expect(createTransfer(fd({ amount: '0' }))).rejects.toThrow(/amount/i);
    await expect(createTransfer(fd({ amount: '-10' }))).rejects.toThrow(/amount/i);
  });

  it("rejects when an account doesn't belong to the user", async () => {
    (prisma.accounts.findMany as any).mockResolvedValue([
      { id: 1, user_id: mockUserId, currency: 'USD', deleted_at: null },
    ]);
    await expect(createTransfer(fd())).rejects.toThrow(/account/i);
    expect(prisma.transfers.create).not.toHaveBeenCalled();
  });

  it('rejects when accounts have different currencies', async () => {
    (prisma.accounts.findMany as any).mockResolvedValue([
      { id: 1, user_id: mockUserId, currency: 'USD', deleted_at: null },
      { id: 2, user_id: mockUserId, currency: 'EUR', deleted_at: null },
    ]);
    await expect(createTransfer(fd())).rejects.toThrow(/currency/i);
  });

  it('rejects when an account is soft-deleted', async () => {
    (prisma.accounts.findMany as any).mockResolvedValue([
      { id: 1, user_id: mockUserId, currency: 'USD', deleted_at: null },
      { id: 2, user_id: mockUserId, currency: 'USD', deleted_at: new Date() },
    ]);
    await expect(createTransfer(fd())).rejects.toThrow(/account/i);
  });
});

describe('updateTransfer', () => {
  const mockUserId = 42;

  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(mockUserId);
  });

  function fd(overrides: Record<string, string> = {}) {
    const f = new FormData();
    f.append('fromAccountId', '1');
    f.append('toAccountId', '2');
    f.append('amount', '300');
    f.append('transferDate', '2026-04-17');
    f.append('note', 'Adjusted');
    f.append('tags', '');
    for (const [k, v] of Object.entries(overrides)) f.append(k, v);
    return f;
  }

  it('updates a transfer owned by the user', async () => {
    (prisma as any).transfers.findFirst = vi.fn().mockResolvedValue({
      id: 99, user_id: mockUserId,
    });
    (prisma as any).transfers.update = vi.fn().mockResolvedValue({ id: 99 });
    (prisma.accounts.findMany as any).mockResolvedValue([
      { id: 1, user_id: mockUserId, currency: 'USD', deleted_at: null },
      { id: 2, user_id: mockUserId, currency: 'USD', deleted_at: null },
    ]);

    await updateTransfer(99, fd());

    expect((prisma as any).transfers.update).toHaveBeenCalledWith({
      where: { id: 99 },
      data: expect.objectContaining({ amount: 300, note: 'Adjusted', tags: null }),
    });
  });

  it('rejects when transfer is not owned by user', async () => {
    (prisma as any).transfers.findFirst = vi.fn().mockResolvedValue(null);
    await expect(updateTransfer(99, fd())).rejects.toThrow(/not found|unauthorized/i);
  });
});
