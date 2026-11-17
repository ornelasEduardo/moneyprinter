import { describe, it, expect, vi } from 'vitest';
import { updateTransfer, deleteTransfer } from './transfers';
const db = vi.hoisted(() => ({
  $queryRaw: vi.fn(async () => [{ id: 1 }]),
  transactions: { count: vi.fn(async () => 1) },
  transfers: { findFirst: vi.fn(async () => ({ id: 1 })), update: vi.fn(), deleteMany: vi.fn(async () => ({ count: 1 })) },
  accounts: { findMany: vi.fn(async () => [{ id: 1, currency: 'USD' }, { id: 2, currency: 'USD' }]) },
}));
vi.mock('@/lib/prisma', () => ({ default: db }));
vi.mock('@/lib/transfer-db', async (importOriginal) => ({ ...await importOriginal<typeof import('@/lib/transfer-db')>(), transferDb: { $transaction: vi.fn(async (fn) => fn(db)) } }));
vi.mock('@/lib/action-middleware', () => ({ requireAuth: vi.fn(async () => 7) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
describe('linked transfer safety', () => {
  it('requires unlink before editing', async () => {
    const f = new FormData();
    for (const [k,v] of Object.entries({ fromAccountId:'1',toAccountId:'2',amount:'30',transferDate:'2026-11-10' })) f.set(k,v);
    await expect(updateTransfer(1,f)).rejects.toThrow(/unlink/i);
    expect(db.transfers.update).not.toHaveBeenCalled();
  });
  it('requires unlink before deleting', async () => {
    await expect(deleteTransfer(1)).rejects.toThrow(/unlink/i);
    expect(db.transfers.update).not.toHaveBeenCalled();
  });
});
