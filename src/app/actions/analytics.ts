'use server';

import { requireAuth } from '@/lib/action-middleware';
import prisma from '@/lib/prisma';
import { spendingByCategory, cashFlow, spendingTrend, detectAnomalies, filterTransactions, type Transaction, type SpendingFilters } from '@/lib/analytics';
import { detectRecurring, type RecurringCharge } from '@/lib/recurring';
import { splitTags } from '@/lib/tags';

// Cache for recurring charges: key = "userId:start:end"
const recurringCache = new Map<string, { data: RecurringCharge[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchTransactions(userId: number, startDate: Date, endDate: Date): Promise<Transaction[]> {
  const rows = await prisma.transactions.findMany({
    where: {
      user_id: userId,
      date: { gte: startDate, lt: endDate },
      deleted_at: null,
    },
    orderBy: { date: 'asc' },
    include: { accounts: { select: { name: true } } },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    date: row.date.toISOString().split('T')[0],
    type: row.type || 'expense',
    tags: row.tags,
    accountId: row.account_id,
    accountName: row.accounts?.name,
  }));
}

export async function getSpendingByCategory(startDate: Date, endDate: Date, filters?: SpendingFilters) {
  const userId = await requireAuth();
  const transactions = await fetchTransactions(userId, startDate, endDate);
  return spendingByCategory(filterTransactions(transactions, filters));
}

export async function getCashFlow(startDate: Date, endDate: Date, granularity: 'month' | 'week' = 'month') {
  const userId = await requireAuth();
  const transactions = await fetchTransactions(userId, startDate, endDate);
  return cashFlow(transactions, granularity);
}

export async function getSpendingTrend(startDate: Date, endDate: Date, granularity: 'month' | 'week' = 'month') {
  const userId = await requireAuth();
  const transactions = await fetchTransactions(userId, startDate, endDate);
  return spendingTrend(transactions, granularity);
}

export async function getRecurringCharges(startDate: Date, endDate: Date) {
  const userId = await requireAuth();

  const cacheKey = `${userId}:${startDate.toISOString()}:${endDate.toISOString()}`;
  const cached = recurringCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const transactions = await fetchTransactions(userId, startDate, endDate);
  const result = detectRecurring(transactions);

  recurringCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

export async function getSpendingAnomalies(startDate: Date, endDate: Date) {
  const userId = await requireAuth();
  const currentTxs = await fetchTransactions(userId, startDate, endDate);
  const currentSpending = spendingByCategory(currentTxs);

  // Get 6 months of historical data for comparison
  const historicalStart = new Date(startDate);
  historicalStart.setMonth(historicalStart.getMonth() - 6);
  const historicalTxs = await fetchTransactions(userId, historicalStart, startDate);

  const periodMonths = Math.max(
    1,
    (startDate.getTime() - historicalStart.getTime()) / (1000 * 60 * 60 * 24 * 30),
  );

  return detectAnomalies(currentSpending, historicalTxs, periodMonths);
}

export async function getNetWorthTrend(startDate: Date, endDate: Date) {
  const userId = await requireAuth();
  const rows = await prisma.net_worth_history.findMany({
    where: { user_id: userId, date: { gte: startDate, lt: endDate }, deleted_at: null },
    orderBy: { date: 'asc' },
  });
  const history = rows.map((row) => ({
    date: row.date.toISOString().split('T')[0],
    netWorth: Number(row.net_worth),
  }));
  return { history };
}

export async function invalidateRecurringCache() {
  recurringCache.clear();
}

export async function getSpendingFilterOptions() {
  const userId = await requireAuth();
  const [accounts, txRows] = await Promise.all([
    prisma.accounts.findMany({
      where: { user_id: userId, deleted_at: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.transactions.findMany({
      where: { user_id: userId, deleted_at: null },
      select: { tags: true },
      // Let Postgres collapse to distinct tag strings so we don't stream one row
      // per transaction; we still split combos ("food, travel") app-side.
      distinct: ['tags'],
    }),
  ]);
  const tagSet = new Set<string>();
  for (const row of txRows) for (const t of splitTags(row.tags)) tagSet.add(t);
  return {
    accounts: accounts.map((a) => ({ id: a.id, name: a.name })),
    tags: Array.from(tagSet).sort(),
  };
}
