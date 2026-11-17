import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { listPaymentCandidates, reconcilePayment, unlinkPayment, listLinkedPayments } from './payments';
import { deleteTransfer } from './transfers';
import { commitImport } from '@/lib/import';
import { undoAuditEntry } from '@/lib/audit';

const auth = vi.hoisted(() => ({ userId: 0, afterCount: undefined as undefined | (() => Promise<void>) }));
vi.mock('@/lib/prisma', async (importOriginal) => {
  const { default: original } = await importOriginal<typeof import('@/lib/prisma')>();
  return { default: new Proxy(original, { get(target, key) {
    if (key === 'transactions') return new Proxy(target.transactions, { get(model, operation) {
      if (operation === 'count') return async (args: any) => { const result = await model.count(args); await auth.afterCount?.(); return result; };
      return Reflect.get(model, operation);
    } });
    return Reflect.get(target, key);
  } }) };
});
vi.mock('@/lib/transfer-db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/transfer-db')>();
  const { transferDb } = actual;
  return { ...actual, transferDb: new Proxy(transferDb, { get(target, key) {
    if (key === '$transaction') return (fn: any) => target.$transaction((tx) => fn(new Proxy(tx, { get(db, operation) {
      if (operation === 'transactions') return new Proxy(db.transactions, { get(model, method) {
        if (method === 'count') return async (args: any) => { const result = await model.count(args); await auth.afterCount?.(); return result; };
        return Reflect.get(model, method);
      } });
      return Reflect.get(db, operation);
    } })));
    return Reflect.get(target, key);
  } }) };
});
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

  it('serializes deleting a transfer against a concurrent statement attachment', async () => {
    const statement = await entry(checking, 'payment_out');
    const transfer = await db.transfers.create({ data: { user_id: auth.userId, from_account_id: checking, to_account_id: card, amount: '125.10', transfer_date: new Date('2026-11-01') } });
    let resume!: () => void;
    let reached!: () => void;
    const paused = new Promise<void>((resolve) => { reached = resolve; });
    const release = new Promise<void>((resolve) => { resume = resolve; });
    auth.afterCount = async () => { reached(); await release; };
    try {
      const deletion = deleteTransfer(transfer.id);
      const phase = await Promise.race([paused.then(() => 'precheck'), deletion.then(() => 'deleted')]);
      const attachment = reconcilePayment({ transactionId: statement, transferId: transfer.id });
      if (phase === 'precheck') {
        let attached = false;
        const settled = attachment.then(() => { attached = true; }, () => { attached = true; });
        const deadline = Date.now() + 3000;
        while (!attached) {
          const blocked = await db.$queryRaw<{ waiting: boolean }[]>`SELECT EXISTS (
            SELECT 1 FROM pg_stat_activity WHERE datname=current_database()
              AND cardinality(pg_blocking_pids(pid)) > 0 AND query LIKE '%FOR UPDATE OF tr%'
          ) AS waiting`;
          if (blocked[0].waiting) break;
          if (Date.now() > deadline) throw new Error('Reconciliation never reached the transfer lock');
        }
        if (attached) await settled;
      }
      resume();
      const results = await Promise.allSettled([deletion, attachment]);
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      const remaining = await db.transactions.findUniqueOrThrow({ where: { id: statement } });
      const target = await db.transfers.findUniqueOrThrow({ where: { id: transfer.id } });
      expect(remaining.transfer_id === null || target.deleted_at === null).toBe(true);
    } finally { resume(); auth.afterCount = undefined; }
  });

  it('audits imported transfer overwrites and restores their snapshots through history', async () => {
    const transfer = await db.transfers.create({ data: { user_id: auth.userId, from_account_id: checking, to_account_id: card, amount: '125.10', transfer_date: new Date('2026-11-01') } });
    await commitImport(auth.userId, 'transfers', [{ id: transfer.id, from_account_id: checking, to_account_id: card, amount: 200, transfer_date: '2026-11-01' }], 'overwrite');
    const audit = await db.audit_log.findFirstOrThrow({ where: { user_id: auth.userId, entity_type: 'transfers', entity_id: transfer.id, action: 'UPDATE' } });
    expect(audit.batch_id).toMatch(/^[0-9a-f-]{36}$/);
    expect((await db.transfers.findUniqueOrThrow({ where: { id: transfer.id } })).amount.toString()).toBe('200');
    await undoAuditEntry(audit.id, auth.userId);
    expect((await db.transfers.findUniqueOrThrow({ where: { id: transfer.id } })).amount.toString()).toBe('125.1');
    expect((await db.audit_log.findUniqueOrThrow({ where: { id: audit.id } })).undone_at).not.toBeNull();
    await expect(undoAuditEntry(audit.id, auth.userId)).rejects.toThrow(/already undone/i);
    await deleteTransfer(transfer.id);
    const deletion = await db.audit_log.findFirstOrThrow({ where: { user_id: auth.userId, entity_type: 'transfers', entity_id: transfer.id, action: 'DELETE' } });
    await undoAuditEntry(deletion.id, auth.userId);
    expect((await db.transfers.findUniqueOrThrow({ where: { id: transfer.id } })).deleted_at).toBeNull();
  });

  it.each(['import', 'undo'] as const)('serializes %s transfer mutations queued behind reconciliation', async (mutation) => {
    const statement = await entry(checking, 'payment_out');
    const transfer = await db.transfers.create({ data: { user_id: auth.userId, from_account_id: checking, to_account_id: card, amount: '125.10', transfer_date: new Date('2026-11-01') } });
    const oldAudit = await db.audit_log.create({ data: { user_id: auth.userId, entity_type: 'transfers', entity_id: transfer.id, action: 'CREATE', new_value: { amount: '125.10' } } });
    let unlock!: () => void;
    let locked!: () => void;
    const ready = new Promise<void>((resolve) => { locked = resolve; });
    const released = new Promise<void>((resolve) => { unlock = resolve; });
    const blocker = db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM transfers WHERE id=${transfer.id} FOR UPDATE`;
      locked();
      await released;
    });
    async function waitForBlocked(count: number) {
      const deadline = Date.now() + 3000;
      while (true) {
        const rows = await db.$queryRaw<{ count: number }[]>`SELECT count(*)::int AS count FROM pg_stat_activity
          WHERE datname=current_database() AND cardinality(pg_blocking_pids(pid)) > 0`;
        if (rows[0].count >= count) return;
        if (Date.now() > deadline) throw new Error(`Expected ${count} blocked transfer operations`);
      }
    }
    let attachment: Promise<unknown> | undefined;
    let change: Promise<unknown> | undefined;
    try {
      await ready;
      attachment = reconcilePayment({ transactionId: statement, transferId: transfer.id });
      await waitForBlocked(1);
      change = mutation === 'undo' ? undoAuditEntry(oldAudit.id, auth.userId) : commitImport(auth.userId, 'transfers', [{
        id: transfer.id, from_account_id: checking, to_account_id: card, amount: 200, transfer_date: '2026-11-01',
      }], 'overwrite');
      void change.catch(() => {});
      await waitForBlocked(2);
      unlock();
      await blocker;
      const results = await Promise.allSettled([attachment, change]);
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      const target = await db.transfers.findUniqueOrThrow({ where: { id: transfer.id } });
      expect(target.deleted_at).toBeNull();
      expect(target.amount.toString()).toBe('125.1');
      expect((await db.audit_log.findUniqueOrThrow({ where: { id: oldAudit.id } })).undone_at).toBeNull();
    } finally {
      unlock();
      await Promise.allSettled([blocker, attachment, change]);
    }
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
    await expect(undoAuditEntry(oldAudit.id, auth.userId)).rejects.toThrow(/unlink/i);
    expect((await db.transactions.findUniqueOrThrow({ where: { id: first } })).deleted_at).toBeNull();
    expect((await listLinkedPayments(transferId))).toHaveLength(2);
    expect((await db.audit_log.findUniqueOrThrow({ where: { id: oldAudit.id } })).undone_at).toBeNull();
  });
});
