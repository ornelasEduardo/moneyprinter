import { beforeEach, describe, expect, it, vi } from 'vitest';
import { restoreSnapshot, validateSnapshot } from './restore';

const db = vi.hoisted(() => {
  let nextId = 100;
  const entities = ['accounts', 'transactions', 'transfers', 'income_sources', 'income_budgets', 'budget_limits', 'goals', 'user_settings', 'net_worth_history', 'provenance', 'categorization_rules', 'audit_log'];
  const client: Record<string, unknown> = {};
  for (const name of entities) client[name] = {
    create: vi.fn(async ({ data }) => ({ ...data, id: nextId++ })),
    update: vi.fn(async ({ where, data }) => ({ ...data, id: where.id })),
    findUnique: vi.fn(async () => null),
    upsert: vi.fn(async ({ create }) => ({ ...create, id: nextId++ })),
  };
  return { client, transaction: vi.fn(async (fn) => fn(client)) };
});
vi.mock('./restore-db', () => ({ restoreDb: { $transaction: db.transaction } }));

const snapshot = {
  accounts: [
    { id: 1, name: 'Checking', type: 'checking', balance: 500, currency: 'USD' },
    { id: 2, name: 'Card', type: 'credit', balance: -100, currency: 'USD' },
  ],
  transfers: [{ id: 3, from_account_id: 1, to_account_id: 2, amount: 50, transfer_date: '2026-01-02' }],
  transactions: [
    { id: 4, account_id: 2, name: 'Purchase', amount: 100, type: 'expense', date: '2026-01-01' },
    { id: 5, account_id: 2, name: 'Refund', amount: 20, type: 'refund', date: '2026-01-02', original_transaction_id: 4 },
    { id: 6, account_id: 1, name: 'Payment', amount: 50, type: 'payment_out', date: '2026-01-02', transfer_id: 3 },
    { id: 7, account_id: 2, name: 'Payment', amount: 50, type: 'payment_in', date: '2026-01-03', transfer_id: 3 },
  ],
};

describe('backup relationship restoration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('remaps all account, refund purchase, and payment transfer IDs for the authenticated user', async () => {
    const result = await restoreSnapshot(42, snapshot);
    const accounts = db.client.accounts as { create: ReturnType<typeof vi.fn> };
    const transactions = db.client.transactions as { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
    const transfers = db.client.transfers as { create: ReturnType<typeof vi.fn> };
    const checkingId = (await accounts.create.mock.results[0].value).id;
    const cardId = (await accounts.create.mock.results[1].value).id;
    const transferId = (await transfers.create.mock.results[0].value).id;
    const purchaseId = (await transactions.create.mock.results[0].value).id;
    expect(transfers.create).toHaveBeenCalledWith({ data: expect.objectContaining({ user_id: 42, from_account_id: checkingId, to_account_id: cardId }) });
    expect(transactions.create.mock.calls[2][0].data).toMatchObject({ user_id: 42, account_id: checkingId, transfer_id: transferId });
    expect(transactions.update).toHaveBeenCalledWith(expect.objectContaining({ data: { original_transaction_id: purchaseId } }));
    expect(result.created).toBe(7);
  });

  it('never copies settings secrets into audit history', async () => {
    await restoreSnapshot(42, { user_settings: [{ id: 1, key: 'integration.bea-col.key', value: 'secret-token' }] });
    expect((db.client.audit_log as any).create).not.toHaveBeenCalled();
  });

  it('preserves keyed existing rows and reports actual created and skipped counts', async () => {
    for (const entity of ['budget_limits', 'net_worth_history', 'user_settings']) {
      (db.client[entity] as any).findUnique.mockResolvedValueOnce({ id: 900 });
    }
    expect(await restoreSnapshot(42, {
      budget_limits: [{ id: 1, category: 'Food', limit_amount: 100 }],
      net_worth_history: [{ id: 2, date: '2026-01-01', net_worth: 100 }],
      user_settings: [{ id: 3, key: 'theme', value: 'dark' }],
    })).toEqual({ created: 0, skipped: 3 });
    expect((db.client.audit_log as any).create).not.toHaveBeenCalled();
  });

  it('remaps nested account rule conditions including lists', async () => {
    const conditions = { type: 'group', conditions: [
      { type: 'condition', field: 'account_id', operator: 'eq', value: 1 },
      { type: 'group', conditions: [
        { type: 'condition', field: 'account_id', operator: 'neq', value: 2 },
        { type: 'condition', field: 'account_id', operator: 'in', value: [1, 2] },
        { type: 'condition', field: 'account_id', operator: 'notIn', value: [2] },
      ] },
    ] };
    await restoreSnapshot(42, { accounts: snapshot.accounts, categorization_rules: [{ id: 3, name: 'Rule', conditions, actions: {} }] });
    const a = (db.client.accounts as any).create;
    const first = (await a.mock.results[0].value).id;
    const second = (await a.mock.results[1].value).id;
    const restored = (db.client.categorization_rules as any).create.mock.calls[0][0].data.conditions;
    expect(restored.conditions[0].value).toBe(first);
    expect(restored.conditions[1].conditions.map((c: any) => c.value)).toEqual([second, [first, second], [second]]);
    expect(() => validateSnapshot({ categorization_rules: [{ id: 3, name: 'Rule', conditions, actions: {} }] })).toThrow(/reference/i);
  });

  it('rejects references outside the archive instead of linking another user records', async () => {
    await expect(restoreSnapshot(42, { ...snapshot, transactions: [{ ...snapshot.transactions[1], original_transaction_id: 999 }] })).rejects.toThrow(/reference/i);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('rejects mismatched payment direction and transfer amount', () => {
    expect(() => validateSnapshot({ ...snapshot, transactions: [{ ...snapshot.transactions[2], amount: 49 }] })).toThrow(/payment/i);
    expect(() => validateSnapshot({ ...snapshot, transactions: [{ ...snapshot.transactions[2], account_id: 2 }] })).toThrow(/payment/i);
  });

  it('rejects duplicate payment legs and duplicate original IDs', () => {
    expect(() => validateSnapshot({ ...snapshot, transactions: [...snapshot.transactions, { ...snapshot.transactions[2], id: 8 }] })).toThrow(/duplicate/i);
    expect(() => validateSnapshot({ ...snapshot, accounts: [...snapshot.accounts, snapshot.accounts[0]] })).toThrow(/duplicate/i);
  });

  it('accepts legacy snapshots without relationship columns', async () => {
    await expect(restoreSnapshot(42, { accounts: snapshot.accounts, transactions: [snapshot.transactions[0]] })).resolves.toMatchObject({ created: 3 });
  });

  it('restores legacy null transaction types using the existing expense default', async () => {
    await restoreSnapshot(42, { accounts: snapshot.accounts, transactions: [{ ...snapshot.transactions[0], type: null }] });
    const transactions = db.client.transactions as { create: ReturnType<typeof vi.fn> };
    expect(transactions.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'expense' }) });
  });
});
