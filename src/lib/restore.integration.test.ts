import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { restoreSnapshot } from './restore';
import { restoreDb } from './restore-db';
import { exportAllEntities } from './export';

const enabled = process.env.RUN_PAYMENT_DB_TESTS === '1';
if (enabled && !process.env.DATABASE_URL?.includes('/moneyprinter_refunds_test')) throw new Error('Restore DB tests require the disposable moneyprinter_refunds_test database');
const db = new PrismaClient();
const users: number[] = [];

async function user() {
  const row = await db.users.create({ data: { username: `restore_test_${randomUUID()}` } });
  users.push(row.id);
  return row.id;
}

describe.skipIf(!enabled)('backup restore against disposable PostgreSQL', () => {
  afterEach(async () => {
    for (const userId of users.splice(0)) {
      await db.provenance.deleteMany({ where: { user_id: userId } });
      await db.audit_log.deleteMany({ where: { user_id: userId } });
      await db.transactions.deleteMany({ where: { user_id: userId } });
      await db.transfers.deleteMany({ where: { user_id: userId } });
      await db.accounts.deleteMany({ where: { user_id: userId } });
      await db.categorization_rules.deleteMany({ where: { user_id: userId } });
      await db.users.delete({ where: { id: userId } });
    }
  });
  afterAll(async () => { await db.$disconnect(); await restoreDb.$disconnect(); });

  it('round-trips refunds and both linked payment statements into new IDs with atomic audits', async () => {
    const source = await user();
    const target = await user();
    const checking = await db.accounts.create({ data: { user_id: source, name: 'Checking', type: 'checking', balance: 800, currency: 'USD' } });
    const card = await db.accounts.create({ data: { user_id: source, name: 'Card', type: 'credit', balance: -100, currency: 'USD' } });
    const transfer = await db.transfers.create({ data: { user_id: source, from_account_id: checking.id, to_account_id: card.id, amount: 75, transfer_date: new Date('2026-11-01') } });
    const purchase = await db.transactions.create({ data: { user_id: source, account_id: card.id, name: 'Purchase', type: 'expense', amount: 100, date: new Date('2026-10-30') } });
    await db.transactions.createMany({ data: [
      { user_id: source, account_id: card.id, name: 'Refund', type: 'refund', amount: 25, date: new Date('2026-11-01'), original_transaction_id: purchase.id },
      { user_id: source, account_id: checking.id, name: 'Payment sent', type: 'payment_out', amount: 75, date: new Date('2026-11-01'), transfer_id: transfer.id },
      { user_id: source, account_id: card.id, name: 'Payment received', type: 'payment_in', amount: 75, date: new Date('2026-11-02'), transfer_id: transfer.id },
    ] });
    const snapshot = await exportAllEntities(source);
    expect(await restoreSnapshot(target, snapshot)).toEqual({ created: 7 });
    const restored = await db.transactions.findMany({ where: { user_id: target } });
    const restoredPurchase = restored.find((row) => row.type === 'expense')!;
    expect(restored.find((row) => row.type === 'refund')!.original_transaction_id).toBe(restoredPurchase.id);
    expect(restoredPurchase.id).not.toBe(purchase.id);
    const restoredTransfer = await db.transfers.findFirstOrThrow({ where: { user_id: target } });
    expect(restored.filter((row) => row.transfer_id === restoredTransfer.id)).toHaveLength(2);
    expect(restoredTransfer.id).not.toBe(transfer.id);
    const accounts = await db.accounts.findMany({ where: { user_id: target } });
    expect(accounts.map((row) => Number(row.balance)).sort((a, b) => a - b)).toEqual([-100, 800]);
    const audits = await db.audit_log.findMany({ where: { user_id: target } });
    expect(audits).toHaveLength(7);
    expect(new Set(audits.map((row) => row.batch_id)).size).toBe(1);
    expect(audits.every((row) => (row.new_value as { backup_restore?: boolean }).backup_restore)).toBe(true);
  });

  it('rejects foreign links without leaving newly-created accounts', async () => {
    const target = await user();
    await expect(restoreSnapshot(target, {
      accounts: [{ id: 1, name: 'Checking', type: 'checking', balance: 1 }],
      transactions: [{ id: 2, account_id: 1, name: 'Payment', type: 'payment_in', amount: 50, date: '2026-11-01', transfer_id: 999999 }],
    })).rejects.toThrow(/reference/i);
    expect(await db.accounts.count({ where: { user_id: target } })).toBe(0);
  });
});
