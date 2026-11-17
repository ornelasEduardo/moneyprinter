'use server';

import prisma from '@/lib/prisma';
import { transferDb, lockUnlinkedTransfer, writeTransferAudit } from '@/lib/transfer-db';
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

function parseAndValidate(formData: FormData): TransferFields {
  const from_account_id = parseInt(formData.get('fromAccountId') as string, 10);
  const to_account_id = parseInt(formData.get('toAccountId') as string, 10);
  const amount = parseFloat(formData.get('amount') as string);
  const transferDateRaw = formData.get('transferDate') as string;
  const note = (formData.get('note') as string) || null;
  const tags = (formData.get('tags') as string) || null;

  if (!from_account_id || !to_account_id || !transferDateRaw || isNaN(amount)) {
    throw new Error('Missing required fields');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
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

type AccountValidationDb = {
  accounts: {
    findMany(args: {
      where: { id: { in: number[] }; user_id: number; deleted_at: null };
      select: { id: true; currency: true };
    }): PromiseLike<{ id: number; currency: string | null }[]>;
  };
};

async function assertAccountsValid(userId: number, fromId: number, toId: number, db: AccountValidationDb = prisma) {
  const accounts = await db.accounts.findMany({
    where: { id: { in: [fromId, toId] }, user_id: userId, deleted_at: null },
    select: { id: true, currency: true },
  });
  if (accounts.length !== 2) {
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

async function mutateUnlinkedTransfer(id: number, userId: number, fields?: TransferFields) {
  await transferDb.$transaction(async (db) => {
    // Reconciliation takes the same row lock before attaching a statement.
    // Check links only after acquiring it, so neither operation can pass a
    // stale precheck and invalidate the other operation's result.
    const before = await lockUnlinkedTransfer(db, userId, id, fields ? 'editing this transfer' : 'deleting this transfer');
    if (fields) await assertAccountsValid(userId, fields.from_account_id, fields.to_account_id, db);
    const now = new Date();
    const after = await db.transfers.update({
      where: { id, user_id: userId },
      data: fields ? { ...fields, updated_at: now } : { deleted_at: now },
    });
    await writeTransferAudit(db, userId, id, before, after, fields ? 'UPDATE' : 'DELETE');
  });
}

export async function updateTransfer(id: number, formData: FormData) {
  const userId = await requireAuth();
  const fields = parseAndValidate(formData);
  await mutateUnlinkedTransfer(id, userId, fields);
  revalidatePath('/');
}

export async function deleteTransfer(id: number) {
  const userId = await requireAuth();
  await mutateUnlinkedTransfer(id, userId);
  revalidatePath('/');
}

export async function listTransfers() {
  const userId = await requireAuth();
  return prisma.transfers.findMany({
    where: { user_id: userId, deleted_at: null },
    orderBy: { transfer_date: 'desc' },
  });
}
