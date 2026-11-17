import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reconcilePayment, unlinkPayment, listPaymentCandidates } from './payments';
import prisma from '@/lib/prisma';

const { query, execute, audit, transaction } = vi.hoisted(() => ({
  query: vi.fn(), execute: vi.fn(), audit: vi.fn(), transaction: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ default: { $queryRaw: query, $transaction: transaction } }));
vi.mock('@/lib/action-middleware', () => ({ requireAuth: vi.fn().mockResolvedValue(7) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const from = { id: 1, user_id: 7, account_id: 10, accountName: 'Checking', currency: 'USD', type: 'payment_out', amount: '125.10', date: '2026-11-01', name: 'Card payment', transfer_id: null, deleted_at: null, account_deleted_at: null };
const to = { ...from, id: 2, account_id: 20, type: 'payment_in' };

beforeEach(() => {
  vi.clearAllMocks();
  execute.mockResolvedValue(1);
  audit.mockResolvedValue({ id: 1 });
  transaction.mockImplementation((fn) => fn({ $queryRaw: query, $executeRaw: execute, audit_log: { create: audit } }));
});

describe('reconcilePayment', () => {
  it('creates one transfer and links both statement records inside a serializable transaction', async () => {
    query.mockResolvedValueOnce([from]).mockResolvedValueOnce([to]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 100 }]);
    expect(await reconcilePayment({ transactionId: 1, counterpartTransactionId: 2 })).toEqual({ transferId: 100 });
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: 'Serializable' }));
    expect(execute).toHaveBeenCalledTimes(5);
    const auditCalls = execute.mock.calls.filter(([sql]) => sql.strings.join('').includes('INSERT INTO audit_log'));
    expect(auditCalls).toHaveLength(3);
    expect(new Set(auditCalls.map(([sql]) => sql.values[1])).size).toBe(1);
  });

  it('rejects inaccessible, already matched, and stale statement records before writes', async () => {
    for (const row of [null, { ...from, transfer_id: 5 }]) {
      query.mockReset().mockResolvedValueOnce(row ? [row] : []);
      await expect(reconcilePayment({ transactionId: 1, counterpartTransactionId: 2 })).rejects.toThrow(/payment|found|matched/i);
    }
    expect(execute).not.toHaveBeenCalled();
  });

  it('rejects mismatched amounts or accounts before creating a transfer', async () => {
    query.mockResolvedValueOnce([from]).mockResolvedValueOnce([{ ...to, amount: '125.11' }]);
    await expect(reconcilePayment({ transactionId: 1, counterpartTransactionId: 2 })).rejects.toThrow(/cannot be matched/i);
    expect(execute).not.toHaveBeenCalled();
  });

  it('attaches a delayed second statement to an existing transfer instead of making another', async () => {
    query.mockResolvedValueOnce([to]).mockResolvedValueOnce([{ id: 100, user_id: 7, from_account_id: 10, to_account_id: 20, amount: '125.10', date: '2026-11-01', fromCurrency: 'USD', toCurrency: 'USD', deleted_at: null, occupiedAccountIds: [10] }]);
    expect(await reconcilePayment({ transactionId: 2, transferId: 100 })).toEqual({ transferId: 100 });
    expect(query).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('requires exactly one reconciliation choice', async () => {
    await expect(reconcilePayment({ transactionId: 1 })).rejects.toThrow(/choose/i);
    await expect(reconcilePayment({ transactionId: 1, transferId: 4, counterpartTransactionId: 2 })).rejects.toThrow(/choose/i);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('does not create a duplicate when matching statements for an existing manual transfer', async () => {
    const transfer = { id: 100, user_id: 7, from_account_id: 10, to_account_id: 20, amount: '125.10', date: '2026-11-01', fromCurrency: 'USD', toCurrency: 'USD', deleted_at: null, occupiedAccountIds: [] };
    query.mockResolvedValueOnce([from]).mockResolvedValueOnce([to]).mockResolvedValueOnce([transfer]);
    await expect(reconcilePayment({ transactionId: 1, counterpartTransactionId: 2 })).rejects.toThrow(/existing transfer/i);
    expect(execute).not.toHaveBeenCalled();
  });

  it('returns an actionable conflict for concurrent reconciliation', async () => {
    transaction.mockRejectedValueOnce({ code: 'P2034' });
    await expect(reconcilePayment({ transactionId: 1, counterpartTransactionId: 2 })).rejects.toThrow(/changed|refresh/i);
  });
});

describe('unlinkPayment', () => {
  it('unlinks one statement and preserves a transfer when its other statement is linked', async () => {
    query.mockResolvedValueOnce([{ ...from, transfer_id: 100 }]).mockResolvedValueOnce([{ id: 100 }]).mockResolvedValueOnce([{ count: 1 }]);
    await unlinkPayment(1);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('soft-deletes the transfer only after the last statement is unlinked', async () => {
    query.mockResolvedValueOnce([{ ...from, transfer_id: 100 }]).mockResolvedValueOnce([{ id: 100 }]).mockResolvedValueOnce([{ count: 0 }]);
    await unlinkPayment(1);
    expect(execute).toHaveBeenCalledTimes(4);
  });
});

it('does not expose candidates for another user’s payment', async () => {
  query.mockResolvedValueOnce([]);
  await expect(listPaymentCandidates(1)).rejects.toThrow(/not found/i);
  expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
});
