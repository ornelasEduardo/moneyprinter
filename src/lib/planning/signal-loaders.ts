// Server-only signal loader implementations (Prisma-backed). Kept out of
// signals.ts so that file — and everything that imports it, notably
// mortgage.ts, which MortgageCalculator.tsx (a client component) also
// imports for its pure math — stays free of Prisma and its
// node:async_hooks dependency (@/lib/audit-context), which Next's client
// webpack bundle cannot resolve.
import prisma from '@/lib/prisma';
import { TRAILING_MONTHS, liquidBalance, netWorth, monthlyIncome, monthlySurplus } from './signals';
import { colThresholds } from './col';
import { loadColThresholds } from './col-loader';

const round2 = (n: number) => Math.round(n * 100) / 100;

function trailingStart(): Date {
  // Pure of "now" is impossible for a trailing window; compute at call time.
  const d = new Date();
  d.setMonth(d.getMonth() - TRAILING_MONTHS);
  return d;
}

export async function loadLiquidBalance(userId: number): Promise<number> {
  const r = await prisma.accounts.aggregate({
    where: { user_id: userId, deleted_at: null, type: { in: ['checking', 'savings'] } },
    _sum: { balance: true },
  });
  return Number(r._sum.balance) || 0;
}

export async function loadNetWorth(userId: number): Promise<number> {
  const r = await prisma.accounts.aggregate({
    where: { user_id: userId, deleted_at: null },
    _sum: { balance: true },
  });
  return Number(r._sum.balance) || 0;
}

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

export async function loadMonthlyIncome(userId: number): Promise<number> {
  const { income } = await trailingTotals(userId);
  return round2(income / TRAILING_MONTHS);
}

export async function loadMonthlySurplus(userId: number): Promise<number> {
  const { income, expense } = await trailingTotals(userId);
  return round2((income - expense) / TRAILING_MONTHS);
}

export type SignalLoader = (userId: number) => Promise<unknown>;

// Keyed by Signal.id — createServerContext looks a signal's loader up here
// instead of calling a `.load()` method on the signal object itself.
export const SIGNAL_LOADERS: Record<string, SignalLoader> = {
  [liquidBalance.id]: loadLiquidBalance,
  [netWorth.id]: loadNetWorth,
  [monthlyIncome.id]: loadMonthlyIncome,
  [monthlySurplus.id]: loadMonthlySurplus,
  [colThresholds.id]: loadColThresholds,
};
