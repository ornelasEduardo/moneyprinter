import prisma from '@/lib/prisma';

export type TransactionMovement = {
  kind: 'income' | 'expense';
  id: number;
  name: string;
  amount: number;
  date: Date;
  tags: string | null;
  account_id: number | null;
};

export type TransferMovement = {
  kind: 'transfer';
  id: number;
  amount: number;
  date: Date; // normalized from transfer_date
  note: string | null;
  tags: string | null;
  from_account_id: number;
  to_account_id: number;
};

export type Movement = TransactionMovement | TransferMovement;

export async function listMovements(params: { userId: number; year?: number }): Promise<Movement[]> {
  const { userId, year } = params;

  const yearRange = year
    ? { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) }
    : undefined;

  const [txs, trs] = await Promise.all([
    prisma.transactions.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
        ...(yearRange ? { date: yearRange } : {}),
      },
    }),
    prisma.transfers.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
        ...(yearRange ? { transfer_date: yearRange } : {}),
      },
    }),
  ]);

  const txMovements: TransactionMovement[] = txs.map((t: any) => ({
    kind: (t.type as 'income' | 'expense') ?? 'expense',
    id: t.id,
    name: t.name,
    amount: Number(t.amount),
    date: t.date,
    tags: t.tags,
    account_id: t.account_id,
  }));

  const trMovements: TransferMovement[] = trs.map((t: any) => ({
    kind: 'transfer',
    id: t.id,
    amount: Number(t.amount),
    date: t.transfer_date,
    note: t.note,
    tags: t.tags,
    from_account_id: t.from_account_id,
    to_account_id: t.to_account_id,
  }));

  return [...txMovements, ...trMovements].sort((a, b) => b.date.getTime() - a.date.getTime());
}
