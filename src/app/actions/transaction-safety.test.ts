import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTransaction, updateTransaction, deleteTransaction } from './transactions';

const db = vi.hoisted(() => ({
  transactions: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  accounts: { findFirst: vi.fn() },
  categorization_rules: { findMany: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ default: db }));
vi.mock('@/lib/action-middleware', () => ({ requireAuth: vi.fn(async () => 7) }));
vi.mock('@/lib/tagging', () => ({ applyRulesAtCreate: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

function form(type = 'expense', amount = '30') {
  const f = new FormData();
  for (const [k, v] of Object.entries({ name: 'Return', amount, type, date: '2026-11-10', accountId: '1' })) f.set(k, v);
  return f;
}
describe('transaction accounting safety', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    db.accounts.findFirst.mockResolvedValue({ id: 1, currency: 'USD' });
    db.categorization_rules.findMany.mockResolvedValue([]);
    db.transactions.create.mockResolvedValue({ id: 4 });
  });
  it('rejects unknown types instead of letting reports treat them as expenses', async () => {
    await expect(createTransaction(form('credit-ish'))).rejects.toThrow();
    expect(db.transactions.create).not.toHaveBeenCalled();
  });
  it('requires positive refund magnitudes', async () => {
    await expect(createTransaction(form('refund', '-30'))).rejects.toThrow();
    expect(db.transactions.create).not.toHaveBeenCalled();
  });
  it('cannot edit a linked payment until it is unlinked', async () => {
    db.transactions.findFirst.mockResolvedValue({ id: 2, transfer_id: 99 });
    await expect(updateTransaction(2, form())).rejects.toThrow(/unlink/i);
    expect(db.transactions.update).not.toHaveBeenCalled();
  });
  it('cannot delete a linked payment until it is unlinked', async () => {
    db.transactions.findFirst.mockResolvedValue({ id: 2, transfer_id: 99 });
    db.transactions.deleteMany.mockResolvedValue({ count: 1 });
    await expect(deleteTransaction(2)).rejects.toThrow(/unlink/i);
    expect(db.transactions.deleteMany).not.toHaveBeenCalled();
  });
  it('rejects refund links to another user or a non-expense', async () => {
    db.transactions.findFirst.mockResolvedValue(null);
    const f = form('refund'); f.set('originalTransactionId', '8');
    await expect(createTransaction(f)).rejects.toThrow();
    expect(db.transactions.create).not.toHaveBeenCalled();
  });
  it('guards purchase deletion atomically so refunds do not lose their source', async () => {
    db.transactions.findFirst.mockResolvedValue({ id: 2, transfer_id: null });
    db.transactions.deleteMany.mockResolvedValue({ count: 1 });
    await deleteTransaction(2);
    expect(db.transactions.deleteMany).toHaveBeenCalledWith({ where: expect.objectContaining({ other_transactions: { none: { deleted_at: null } } }) });
  });
});
