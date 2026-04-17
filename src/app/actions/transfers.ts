'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/action-middleware';
import { withAuditContext } from '@/lib/audit-context';

type TransferFields = {
  from_account_id: number;
  to_account_id: number;
  amount: number;
  transfer_date: Date;
  note: string | null;
  tags: string | null;
};

function lastValue(formData: FormData, key: string): string | null {
  const all = formData.getAll(key);
  if (all.length === 0) return null;
  return all[all.length - 1] as string;
}

function parseAndValidate(formData: FormData): TransferFields {
  const from_account_id = parseInt(lastValue(formData, 'fromAccountId') as string, 10);
  const to_account_id = parseInt(lastValue(formData, 'toAccountId') as string, 10);
  const amount = parseFloat(lastValue(formData, 'amount') as string);
  const transferDateRaw = lastValue(formData, 'transferDate') as string;
  const note = lastValue(formData, 'note') || null;
  const tags = lastValue(formData, 'tags') || null;

  if (!from_account_id || !to_account_id || !transferDateRaw || isNaN(amount)) {
    throw new Error('Missing required fields');
  }
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }
  if (from_account_id === to_account_id) {
    throw new Error('Source and destination accounts must differ');
  }

  return {
    from_account_id,
    to_account_id,
    amount,
    transfer_date: new Date(transferDateRaw),
    note,
    tags,
  };
}

async function assertAccountsValid(userId: number, fromId: number, toId: number) {
  const accounts = await prisma.accounts.findMany({
    where: { id: { in: [fromId, toId] }, user_id: userId, deleted_at: null },
    select: { id: true, currency: true, deleted_at: true },
  });
  if (accounts.length !== 2 || accounts.some((a) => a.deleted_at !== null)) {
    throw new Error('Account not found or does not belong to user');
  }
  const [a, b] = accounts;
  if (a.currency !== b.currency) {
    throw new Error('Accounts must share the same currency');
  }
}

export async function createTransfer(formData: FormData) {
  const userId = await requireAuth();
  const fields = parseAndValidate(formData);

  return withAuditContext({ userId }, async () => {
    await assertAccountsValid(userId, fields.from_account_id, fields.to_account_id);

    await prisma.transfers.create({
      data: { user_id: userId, ...fields },
    });

    revalidatePath('/');
  });
}
