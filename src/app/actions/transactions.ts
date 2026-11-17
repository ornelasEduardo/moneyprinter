'use server'

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/action-middleware';
import { withAuditContext } from '@/lib/audit-context';
import { applyRulesAtCreate, type CompiledRule } from '@/lib/tagging';
import type { Filter } from 'doom-design-system/filter';
import { TRANSACTION_TYPES, type TransactionType } from '@/lib/transaction-types';

export async function createTransaction(formData: FormData) {
  const userId = await requireAuth();

  const name = formData.get('name') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const date = formData.get('date') as string;
  const tags = formData.get('tags') as string;
  const accountId = parseInt(formData.get('accountId') as string);
  const type = (formData.get('type') as string) || 'expense';

  if (!name || !Number.isFinite(amount) || !date || Number.isNaN(new Date(date).getTime()) || !accountId) {
    throw new Error('Missing required fields');
  }

  if (!TRANSACTION_TYPES.includes(type as TransactionType)) throw new Error('Unknown transaction type');
  if ((type === 'refund' || type.startsWith('payment_')) && amount <= 0) throw new Error('Refunds and payments require a positive amount');
  const originalTransactionId = Number(formData.get('originalTransactionId')) || null;
  if (originalTransactionId) {
    if (type !== 'refund') throw new Error('Only refunds can link a purchase');
    const original = await prisma.transactions.findFirst({ where: { id: originalTransactionId, user_id: userId, deleted_at: null, type: 'expense', account_id: accountId } });
    if (!original) throw new Error('Original purchase not found in this account');
  }

  return withAuditContext({ userId }, async () => {
    try {
      // Verify the account belongs to the current user
      const account = await prisma.accounts.findFirst({
        where: {
          id: accountId,
          user_id: userId
        }
      });

      if (!account) {
        throw new Error('Account not found or does not belong to user');
      }

      const created = await prisma.transactions.create({
        data: {
          user_id: userId,
          name,
          amount,
          date: new Date(date),
          tags,
          account_id: accountId,
          type,
          ...(originalTransactionId ? { original_transaction_id: originalTransactionId } : {}),
          pending: false
        }
      });

      const ruleRows = await prisma.categorization_rules.findMany({
        where: { user_id: userId, enabled: true, deleted_at: null },
        orderBy: { priority: 'desc' },
      });
      const rules: CompiledRule[] = ruleRows.map((r) => ({
        id: r.id,
        priority: r.priority,
        conditions: r.conditions as unknown as Filter,
        actions: r.actions as unknown as CompiledRule['actions'],
      }));
      await applyRulesAtCreate({ transactionId: created.id, userId, rules });
    } catch (error: any) {
      console.error('Failed to create transaction:', error.message);
      throw new Error('Failed to create transaction');
    }

    const year = formData.get('year') as string;

    revalidatePath('/');

    if (year) {
      redirect(`/?tab=transactions&year=${year}`);
    } else {
      redirect('/?tab=transactions');
    }
  });
}

export async function updateTransaction(id: number, formData: FormData) {
  const userId = await requireAuth();

  const name = formData.get('name') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const date = formData.get('date') as string;
  const tags = formData.get('tags') as string;
  const accountId = parseInt(formData.get('accountId') as string);
  const type = (formData.get('type') as string) || 'expense';

  if (!name || !Number.isFinite(amount) || !date || Number.isNaN(new Date(date).getTime()) || !accountId) {
    throw new Error('Missing required fields');
  }

  if (!TRANSACTION_TYPES.includes(type as TransactionType)) throw new Error('Unknown transaction type');
  if ((type === 'refund' || type.startsWith('payment_')) && amount <= 0) throw new Error('Refunds and payments require a positive amount');
  const originalTransactionId = Number(formData.get('originalTransactionId')) || null;
  if (originalTransactionId) {
    if (type !== 'refund') throw new Error('Only refunds can link a purchase');
    const original = await prisma.transactions.findFirst({ where: { id: originalTransactionId, user_id: userId, deleted_at: null, type: 'expense', account_id: accountId } });
    if (!original) throw new Error('Original purchase not found in this account');
  }

  const linked = await prisma.transactions.findFirst({ where: { id, user_id: userId, deleted_at: null } });
  if (linked?.transfer_id) throw new Error('Unlink this payment before editing it');
  if (originalTransactionId === id) throw new Error('A refund cannot link to itself');

  return withAuditContext({ userId }, async () => {
    try {
      // Verify transaction belongs to user
      const transaction = await prisma.transactions.findFirst({
        where: {
          id: id,
          user_id: userId
        }
      });

      if (!transaction) {
        throw new Error('Transaction not found or unauthorized');
      }

      // Verify account belongs to user
      const account = await prisma.accounts.findFirst({
        where: {
          id: accountId,
          user_id: userId
        }
      });

      if (!account) {
        throw new Error('Account not found or unauthorized');
      }

      await prisma.transactions.update({
        where: {
          id: id, user_id: userId, transfer_id: null,
          ...((linked && (linked.account_id !== accountId || linked.type !== type)) ? { other_transactions: { none: { deleted_at: null } } } : {})
        },
        data: {
          name,
          amount,
          date: new Date(date),
          tags,
          account_id: accountId,
          type,
          original_transaction_id: originalTransactionId
        }
      });

      revalidatePath('/');
    } catch (error) {
      console.error('Failed to update transaction:', error);
      throw new Error('Failed to update transaction');
    }
  });
}

export async function deleteTransaction(id: number) {
  const userId = await requireAuth();

  const linked = await prisma.transactions.findFirst({ where: { id, user_id: userId, deleted_at: null } });
  if (linked?.transfer_id) throw new Error('Unlink this payment before deleting it');

  return withAuditContext({ userId }, async () => {
    try {
      const result = await prisma.transactions.deleteMany({
        where: {
          id: id,
          user_id: userId, transfer_id: null, other_transactions: { none: { deleted_at: null } }
        }
      });

      if (result.count === 0) {
        throw new Error('Transaction not found or unauthorized');
      }

      revalidatePath('/');
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      throw new Error('Failed to delete transaction');
    }
  });
}

export async function getAccounts() {
  const userId = await requireAuth();

  const accounts = await prisma.accounts.findMany({
    where: {
      user_id: userId,
      deleted_at: null
    },
    orderBy: {
      name: 'asc'
    },
    select: {
      id: true,
      name: true
    }
  });
  
  return accounts;
}

export async function getRefundPurchases(accountId: number, originalId?: number | null) {
  const userId = await requireAuth();
  const rows = await prisma.transactions.findMany({
    where: { user_id: userId, account_id: accountId, type: 'expense', deleted_at: null },
    select: { id: true, name: true, amount: true, tags: true, date: true },
    orderBy: { date: 'desc' }, take: 100,
  });
  if (originalId && !rows.some(r => r.id === originalId)) {
    const original = await prisma.transactions.findFirst({ where: { id: originalId, user_id: userId, account_id: accountId, type: 'expense', deleted_at: null }, select: { id: true, name: true, amount: true, tags: true, date: true } });
    if (original) rows.push(original);
  }
  return rows.map(r => ({ ...r, amount: Number(r.amount), date: r.date.toISOString().slice(0, 10) }));
}
