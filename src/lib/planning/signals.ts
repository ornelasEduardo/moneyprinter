import prisma from '@/lib/prisma';

export const TRAILING_MONTHS = 6;

export interface Signal<T> {
  id: string;
  load(userId: number): Promise<T>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function trailingStart(): Date {
  // Pure of "now" is impossible for a trailing window; compute at call time.
  const d = new Date();
  d.setMonth(d.getMonth() - TRAILING_MONTHS);
  return d;
}

export const liquidBalance: Signal<number> = {
  id: 'liquidBalance',
  async load(userId) {
    const r = await prisma.accounts.aggregate({
      where: { user_id: userId, deleted_at: null, type: { in: ['checking', 'savings'] } },
      _sum: { balance: true },
    });
    return Number(r._sum.balance) || 0;
  },
};

export const netWorth: Signal<number> = {
  id: 'netWorth',
  async load(userId) {
    const r = await prisma.accounts.aggregate({
      where: { user_id: userId, deleted_at: null },
      _sum: { balance: true },
    });
    return Number(r._sum.balance) || 0;
  },
};

async function trailingTotals(userId: number) {
  const rows = await prisma.transactions.findMany({
    where: { user_id: userId, deleted_at: null, date: { gte: trailingStart() } },
    select: { amount: true, type: true },
  });
  let income = 0;
  let expense = 0;
  for (const row of rows) {
    const amt = Number(row.amount);
    if (row.type === 'income') income += amt;
    else expense += amt;
  }
  return { income, expense };
}

export const monthlyIncome: Signal<number> = {
  id: 'monthlyIncome',
  async load(userId) {
    const { income } = await trailingTotals(userId);
    return round2(income / TRAILING_MONTHS);
  },
};

export const monthlySurplus: Signal<number> = {
  id: 'monthlySurplus',
  async load(userId) {
    const { income, expense } = await trailingTotals(userId);
    return round2((income - expense) / TRAILING_MONTHS);
  },
};
