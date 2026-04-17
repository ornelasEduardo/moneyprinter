import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listMovements } from './movements';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  default: {
    transactions: { findMany: vi.fn() },
    transfers: { findMany: vi.fn() },
  },
}));

describe('listMovements', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns transactions and transfers merged and sorted by date desc', async () => {
    (prisma.transactions.findMany as any).mockResolvedValue([
      { id: 10, name: 'Coffee', amount: 5, date: new Date('2026-04-10'), type: 'expense', account_id: 1, tags: null },
    ]);
    (prisma.transfers.findMany as any).mockResolvedValue([
      { id: 1, amount: 250, transfer_date: new Date('2026-04-15'), from_account_id: 1, to_account_id: 2, note: 'Sweep', tags: null },
    ]);

    const result = await listMovements({ userId: 42, year: 2026 });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ kind: 'transfer', id: 1 });
    expect(result[1]).toMatchObject({ kind: 'expense', id: 10 });
  });

  it('filters to the supplied year when provided', async () => {
    (prisma.transactions.findMany as any).mockResolvedValue([]);
    (prisma.transfers.findMany as any).mockResolvedValue([]);
    await listMovements({ userId: 42, year: 2025 });

    const txArgs = (prisma.transactions.findMany as any).mock.calls[0][0];
    const trArgs = (prisma.transfers.findMany as any).mock.calls[0][0];
    expect(txArgs.where.date.gte).toEqual(new Date('2025-01-01'));
    expect(txArgs.where.date.lte).toEqual(new Date('2025-12-31'));
    expect(trArgs.where.transfer_date.gte).toEqual(new Date('2025-01-01'));
  });

  it('excludes soft-deleted rows on both tables', async () => {
    (prisma.transactions.findMany as any).mockResolvedValue([]);
    (prisma.transfers.findMany as any).mockResolvedValue([]);
    await listMovements({ userId: 42, year: 2026 });

    const txArgs = (prisma.transactions.findMany as any).mock.calls[0][0];
    const trArgs = (prisma.transfers.findMany as any).mock.calls[0][0];
    expect(txArgs.where.deleted_at).toBeNull();
    expect(trArgs.where.deleted_at).toBeNull();
  });
});
