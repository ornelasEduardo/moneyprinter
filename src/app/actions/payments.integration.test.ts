import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { listPaymentCandidates, reconcilePayment, unlinkPayment, listLinkedPayments } from './payments';
import { undoAuditEntry } from '@/lib/audit';

const auth = vi.hoisted(() => ({ userId: 0 }));
vi.mock('@/lib/action-middleware', () => ({ requireAuth: vi.fn(async () => auth.userId) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const enabled = process.env.RUN_PAYMENT_DB_TESTS === '1';
if (enabled && !process.env.DATABASE_URL?.includes('/moneyprinter_refunds_test')) {
  throw new Error('Payment DB tests must run against the disposable moneyprinter_refunds_test database');
}
const db = new PrismaClient();
const users: number[] = [];
let checking = 0;
let card = 0;

async function entry(account: number, type: string, amount = '125.10', userId = auth.userId) {
  const row = await db.transactions.create({ data: { user_id: userId, account_id: account, type, amount, date: new Date('2026-11-01'), name: `Payment ${randomUUID()}` } });
  return row.id;
}

describe.skipIf(!enabled)('payment reconciliation against disposable PostgreSQL', () => {
  beforeEach(async () => {
    const user = await db.users.create({ data: { username: `payment_test_${randomUUID()}` } });
    users.push(user.id);
    auth.userId = user.id;
    checking = (await db.accounts.create({ data: { user_id: user.id, name: 'Checking', type: 'checking', currency: 'USD', balance: 1000 } })).id;
    card = (await db.accounts.create({ data: { user_id: user.id, name: 'Card', type: 'credit', currency: 'USD', balance: -200 } })).id;
  });

  afterEach(async () => {
    if (!users.length) return;
    await db.$transaction(async (tx) => {
      const ids = Prisma.join(users);
      await tx.$executeRaw`DELETE FROM audit_log WHERE user_id IN (${ids})`;
      await tx.$executeRaw`DELETE FROM transactions WHERE user_id IN (${ids})`;
      await tx.$executeRaw`DELETE FROM transfers WHERE user_id IN (${ids})`;
      await tx.$executeRaw`DELETE FROM accounts WHERE user_id IN (${ids})`;
      await tx.$executeRaw`DELETE FROM users WHERE id IN (${ids})`;
    });
    users.splice(0);
  });

  afterAll(async () => { await db.$disconnect(); });

  it.each(['checking-first', 'card-first'])('links both statements once and preserves account balances (%s)', async (order) => {
    const first = order === 'checking-first' ? await entry(checking, 'payment_out') : await entry(card, 'payment_in');
    const second = order === 'checking-first' ? await entry(card, 'payment_in') : await entry(checking, 'payment_out');
    expect((await listPaymentCandidates(first)).payments.map((p) => p.id)).toEqual([second]);
    const { transferId } = await reconcilePayment({ transactionId: first, counterpartTransactionId: second });
    expect(await db.transfers.count({ where: { user_id: auth.userId, deleted_at: null } })).toBe(1);
    expect((await listLinkedPayments(transferId)).map((p) => p.id).sort()).toEqual([first, second].sort());
    expect((await db.accounts.findUniqueOrThrow({ where: { id: checking } })).balance.toString()).toBe('1000');
    expect((await db.accounts.findUniqueOrThrow({ where: { id: card } })).balance.toString()).toBe('-200');
    expect(await db.audit_log.count({ where: { user_id: auth.userId } })).toBe(3);
    await expect(reconcilePayment({ transactionId: first, counterpartTransactionId: second })).rejects.toThrow(/changed|matched/i);
  });

  it('links a later second statement to a single-sided transfer and unlinks without losing records', async () => {
    const first = await entry(checking, 'payment_out');
    const { transferId } = await reconcilePayment({ transactionId: first, counterpartyAccountId: card });
    const second = await entry(card, 'payment_in');
    expect((await listPaymentCandidates(second)).transfers.map((t) => t.id)).toEqual([transferId]);
    await reconcilePayment({ transactionId: second, transferId });
    expect(await db.transfers.count({ where: { user_id: auth.userId } })).toBe(1);
    await unlinkPayment(first);
    expect((await db.transfers.findUniqueOrThrow({ where: { id: transferId } })).deleted_at).toBeNull();
    await unlinkPayment(second);
    expect((await db.transfers.findUniqueOrThrow({ where: { id: transferId } })).deleted_at).not.toBeNull();
    const statements = await db.transactions.findMany({ where: { user_id: auth.userId } });
    expect(statements).toHaveLength(2);
    expect(statements.every((t) => !t.transfer_id && !t.deleted_at)).toBe(true);
  });

  it('allows only one concurrent confirmation and leaves no orphan transfer or partial audit', async () => {
    const first = await entry(checking, 'payment_out');
    const second = await entry(card, 'payment_in');
    const results = await Promise.allSettled([
      reconcilePayment({ transactionId: first, counterpartTransactionId: second }),
      reconcilePayment({ transactionId: first, counterpartTransactionId: second }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(await db.transfers.count({ where: { user_id: auth.userId } })).toBe(1);
    expect(await db.audit_log.count({ where: { user_id: auth.userId } })).toBe(3);
  });

  it('rejects cross-user payment matching without writing data', async () => {
    const first = await entry(checking, 'payment_out');
    const other = await db.users.create({ data: { username: `payment_test_${randomUUID()}` } });
    users.push(other.id);
    const otherCard = await db.accounts.create({ data: { user_id: other.id, name: 'Other card', type: 'credit', currency: 'USD', balance: 0 } });
    const second = await entry(otherCard.id, 'payment_in', '125.10', other.id);
    expect((await listPaymentCandidates(first)).payments).toEqual([]);
    await expect(reconcilePayment({ transactionId: first, counterpartTransactionId: second })).rejects.toThrow(/not found|unauthorized/i);
    expect(await db.transfers.count({ where: { user_id: auth.userId } })).toBe(0);
    expect(await db.audit_log.count({ where: { user_id: auth.userId } })).toBe(0);
  });

  it('blocks undoing a pre-match statement import after reconciliation', async () => {
    const first = await entry(checking, 'payment_out');
    const second = await entry(card, 'payment_in');
    const oldAudit = await db.audit_log.create({ data: {
      user_id: auth.userId, entity_type: 'transactions', entity_id: first, action: 'CREATE',
      new_value: { type: 'payment_out', account_id: checking },
    } });
    const { transferId } = await reconcilePayment({ transactionId: first, counterpartTransactionId: second });
    await expect(undoAuditEntry(oldAudit.id)).rejects.toThrow(/unlink/i);
    expect((await db.transactions.findUniqueOrThrow({ where: { id: first } })).deleted_at).toBeNull();
    expect((await listLinkedPayments(transferId))).toHaveLength(2);
    expect((await db.audit_log.findUniqueOrThrow({ where: { id: oldAudit.id } })).undone_at).toBeNull();
  });
});
