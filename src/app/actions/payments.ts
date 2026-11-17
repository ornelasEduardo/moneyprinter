'use server';

import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/action-middleware';
import { canAttachTransfer, matchingTransfers, minorUnits, paymentCandidates, paymentPairAccounts, type PaymentRecord, type PaymentTransfer } from '@/lib/payments';

type Db = Pick<Prisma.TransactionClient, '$queryRaw' | '$executeRaw'>;
type PaymentRow = PaymentRecord & { snapshot?: Record<string, unknown> };
type TransferRow = PaymentTransfer & { snapshot?: Record<string, unknown> };
const CONFLICT = 'This payment changed or was already matched. Refresh and try again.';

function validId(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Invalid payment or account identifier');
}

async function payment(db: Pick<Db, '$queryRaw'>, userId: number, id: number, lock = false): Promise<PaymentRow> {
  validId(id);
  const rows = await db.$queryRaw<PaymentRow[]>(Prisma.sql`
    SELECT t.id, t.user_id, t.account_id, a.name AS "accountName", a.currency,
      t.type, t.amount::text, t.date::text, t.name, t.transfer_id,
      t.deleted_at::text, a.deleted_at::text AS account_deleted_at, to_jsonb(t) AS snapshot
    FROM transactions t JOIN accounts a ON a.id=t.account_id
    WHERE t.id=${id} AND t.user_id=${userId} AND a.user_id=${userId}
      AND t.deleted_at IS NULL AND a.deleted_at IS NULL
    ${lock ? Prisma.sql`FOR UPDATE OF t` : Prisma.empty}`);
  if (!rows[0]) throw new Error('Payment not found or unauthorized');
  return rows[0];
}

async function transfers(db: Pick<Db, '$queryRaw'>, userId: number, id?: number): Promise<TransferRow[]> {
  return db.$queryRaw<TransferRow[]>(Prisma.sql`
    SELECT tr.id, tr.user_id, tr.from_account_id, tr.to_account_id, tr.amount::text,
      tr.transfer_date::text AS date, f.currency AS "fromCurrency", dest.currency AS "toCurrency",
      f.name AS "fromAccountName", dest.name AS "toAccountName", tr.deleted_at::text,
      ARRAY(SELECT account_id FROM transactions WHERE transfer_id=tr.id AND deleted_at IS NULL) AS "occupiedAccountIds",
      to_jsonb(tr) AS snapshot
    FROM transfers tr JOIN accounts f ON f.id=tr.from_account_id JOIN accounts dest ON dest.id=tr.to_account_id
    WHERE tr.user_id=${userId} AND f.user_id=${userId} AND dest.user_id=${userId}
      AND tr.deleted_at IS NULL AND f.deleted_at IS NULL AND dest.deleted_at IS NULL
      ${id == null ? Prisma.empty : Prisma.sql`AND tr.id=${id} FOR UPDATE OF tr`}`);
}

async function audit(db: Db, userId: number, batchId: string, entity: 'transactions' | 'transfers', id: number,
  before: Record<string, unknown> | undefined, after: Record<string, unknown>, action: 'CREATE' | 'UPDATE' | 'DELETE' = 'UPDATE') {
  await db.$executeRaw(Prisma.sql`
    INSERT INTO audit_log (user_id,batch_id,entity_type,entity_id,action,previous_value,new_value)
    VALUES (${userId},${batchId}::uuid,${entity},${id},${action},${before ? JSON.stringify(before) : null}::jsonb,
      ${JSON.stringify({ ...after, payment_reconciliation: true })}::jsonb)`);
}

function assertUnmatched(row: PaymentRecord) {
  if (row.transfer_id != null) throw new Error(CONFLICT);
  if (row.type !== 'payment_in' && row.type !== 'payment_out') throw new Error('Only account payments can be matched');
  minorUnits(row.amount);
}

async function conflictBoundary<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); }
  catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
    if (code === 'P2034' || code === 'P2002' || code === '40001' || code === '23505') throw new Error(CONFLICT);
    // Prisma wraps SQL serialization failures as P2010 with the PostgreSQL code in meta.
    if (code === 'P2010' && error && typeof error === 'object' && 'meta' in error &&
      /40001|23505|40P01/.test(JSON.stringify(error.meta))) throw new Error(CONFLICT);
    throw error;
  }
}

export async function listPaymentCandidates(transactionId: number) {
  const userId = await requireAuth();
  const source = await payment(prisma, userId, transactionId);
  assertUnmatched(source);
  const rows = await prisma.$queryRaw<PaymentRow[]>(Prisma.sql`
    SELECT t.id,t.user_id,t.account_id,a.name AS "accountName",a.currency,t.type,t.amount::text,
      t.date::text,t.name,t.transfer_id,t.deleted_at::text,a.deleted_at::text AS account_deleted_at
    FROM transactions t JOIN accounts a ON a.id=t.account_id
    WHERE t.user_id=${userId} AND a.user_id=${userId} AND t.deleted_at IS NULL AND a.deleted_at IS NULL
      AND t.transfer_id IS NULL AND t.type IN ('payment_in','payment_out')
      AND t.date BETWEEN ${source.date}::date - 7 AND ${source.date}::date + 7`);
  const candidates = await transfers(prisma, userId);
  return { payments: paymentCandidates(source, rows), transfers: matchingTransfers(source, candidates) };
}

export async function reconcilePayment(input: {
  transactionId: number;
  counterpartTransactionId?: number;
  counterpartyAccountId?: number;
  transferId?: number;
}): Promise<{ transferId: number }> {
  const userId = await requireAuth();
  const choices = [input.counterpartTransactionId, input.counterpartyAccountId, input.transferId].filter((v) => v !== undefined);
  if (choices.length !== 1) throw new Error('Choose one matching statement, existing transfer, or other account');
  validId(input.transactionId);
  choices.forEach(validId);
  const result = await conflictBoundary(() => prisma.$transaction(async (db) => {
    const batchId = randomUUID();
    const source = await payment(db, userId, input.transactionId, true);
    assertUnmatched(source);
    let counterpart: PaymentRow | undefined;
    let transferId: number;
    if (input.transferId != null) {
      const target = (await transfers(db, userId, input.transferId))[0];
      if (!target || !canAttachTransfer(source, target)) throw new Error('This transfer cannot be matched to the payment');
      transferId = target.id;
    } else {
      let fromAccountId: number;
      let toAccountId: number;
      if (input.counterpartTransactionId != null) {
        counterpart = await payment(db, userId, input.counterpartTransactionId, true);
        ({ fromAccountId, toAccountId } = paymentPairAccounts(source, counterpart));
      } else {
        const accounts = await db.$queryRaw<{ id: number; currency: string | null }[]>(Prisma.sql`
          SELECT id,currency FROM accounts WHERE id=${input.counterpartyAccountId!} AND user_id=${userId} AND deleted_at IS NULL FOR SHARE`);
        const account = accounts[0];
        if (!account || account.id === source.account_id || !source.currency || account.currency !== source.currency) {
          throw new Error('Choose a different account belonging to you with the same currency');
        }
        fromAccountId = source.type === 'payment_out' ? source.account_id! : account.id;
        toAccountId = source.type === 'payment_in' ? source.account_id! : account.id;
      }
      const existing = matchingTransfers(source, await transfers(db, userId)).filter((t) =>
        t.from_account_id === fromAccountId && t.to_account_id === toAccountId);
      if (existing.length) throw new Error('An existing transfer matches this payment. Select it instead of creating another.');
      const created = await db.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
        INSERT INTO transfers (user_id,from_account_id,to_account_id,amount,transfer_date,note)
        VALUES (${userId},${fromAccountId},${toAccountId},${source.amount}::numeric,${source.date}::date,${source.name}) RETURNING *`);
      transferId = Number(created[0].id);
      await audit(db, userId, batchId, 'transfers', transferId, undefined, created[0], 'CREATE');
    }
    for (const row of [source, ...(counterpart ? [counterpart] : [])]) {
      const count = await db.$executeRaw(Prisma.sql`
        UPDATE transactions SET transfer_id=${transferId}
        WHERE id=${row.id} AND user_id=${userId} AND transfer_id IS NULL AND deleted_at IS NULL`);
      if (count !== 1) throw new Error(CONFLICT);
      await audit(db, userId, batchId, 'transactions', row.id, row.snapshot ?? { transfer_id: null }, { ...(row.snapshot ?? {}), transfer_id: transferId });
    }
    return { transferId };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
  revalidatePath('/');
  return result;
}

export async function unlinkPayment(transactionId: number): Promise<void> {
  const userId = await requireAuth();
  await conflictBoundary(() => prisma.$transaction(async (db) => {
    const batchId = randomUUID();
    const source = await payment(db, userId, transactionId, true);
    if (source.transfer_id == null) throw new Error('Payment is not linked');
    const target = (await transfers(db, userId, source.transfer_id))[0];
    if (!target) throw new Error('Transfer not found or unauthorized');
    await db.$executeRaw(Prisma.sql`UPDATE transactions SET transfer_id=NULL WHERE id=${source.id} AND user_id=${userId}`);
    await audit(db, userId, batchId, 'transactions', source.id, source.snapshot ?? { transfer_id: source.transfer_id }, { ...(source.snapshot ?? {}), transfer_id: null });
    const remaining = await db.$queryRaw<{ count: number }[]>(Prisma.sql`
      SELECT count(*)::int AS count FROM transactions WHERE transfer_id=${source.transfer_id} AND deleted_at IS NULL`);
    if (remaining[0].count === 0) {
      const now = new Date();
      await db.$executeRaw(Prisma.sql`UPDATE transfers SET deleted_at=${now} WHERE id=${source.transfer_id} AND user_id=${userId}`);
      await audit(db, userId, batchId, 'transfers', target.id, target.snapshot ?? {}, { ...(target.snapshot ?? {}), deleted_at: now.toISOString() }, 'DELETE');
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
  revalidatePath('/');
}

export async function listLinkedPayments(transferId: number): Promise<PaymentRecord[]> {
  const userId = await requireAuth();
  validId(transferId);
  return prisma.$queryRaw<PaymentRecord[]>(Prisma.sql`
    SELECT t.id,t.user_id,t.account_id,a.name AS "accountName",a.currency,t.type,t.amount::text,
      t.date::text,t.name,t.transfer_id,t.deleted_at::text,a.deleted_at::text AS account_deleted_at
    FROM transactions t JOIN accounts a ON a.id=t.account_id JOIN transfers tr ON tr.id=t.transfer_id
    WHERE t.transfer_id=${transferId} AND t.user_id=${userId} AND a.user_id=${userId} AND tr.user_id=${userId}
      AND t.deleted_at IS NULL ORDER BY t.date,t.id`);
}
