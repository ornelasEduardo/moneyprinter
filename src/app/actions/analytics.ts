'use server';

import { requireAuth } from '@/lib/action-middleware';
import prisma from '@/lib/prisma';
import { spendingByCategory, cashFlow, spendingTrend, type Transaction } from '@/lib/analytics';
import { detectRecurring, type RecurringCharge } from '@/lib/recurring';

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

export async function getSpendingByCategory(startDate: Date, endDate: Date) {
  const userId = await requireAuth();
  const transactions = await fetchTransactions(userId, startDate, endDate);
  return spendingByCategory(transactions);
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

export async function invalidateRecurringCache() {
  recurringCache.clear();
}
