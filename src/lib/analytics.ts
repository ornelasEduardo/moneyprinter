import { splitTags } from './tags';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface Transaction {
  id: number;
  name: string;
  amount: number;
  date: string;
  type: string;
  tags: string | null;
  accountId: number | null;
  accountName?: string;
}

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
}

export interface CashFlowPeriod {
  period: string;
  income: number;
  expenses: number;
  net: number;
}

export interface SpendingTrendPeriod {
  period: string;
  amount: number;
}

export function spendingByCategory(transactions: Transaction[]): CategorySpending[] {
  const expenses = transactions.filter((t) => t.type === 'expense');
  const categoryTotals = new Map<string, number>();

  for (const tx of expenses) {
    const tags = splitTags(tx.tags);
    const categories = tags.length > 0 ? tags : ['uncategorized'];
    for (const category of categories) {
      categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + tx.amount);
    }
  }

  const total = Array.from(categoryTotals.values()).reduce((sum, amt) => sum + amt, 0);

  return Array.from(categoryTotals.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function periodKey(dateStr: string, granularity: 'month' | 'week'): string {
  // Parse YYYY-MM-DD as local date to avoid UTC timezone shifts
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  if (granularity === 'month') {
    return `${year}-${String(month).padStart(2, '0')}`;
  }
  const d = new Date(year, month - 1, day);
  const dow = d.getDay();
  const diff = d.getDate() - dow + (dow === 0 ? -6 : 1);
  d.setDate(diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dy}`;
}

export function cashFlow(
  transactions: Transaction[],
  granularity: 'month' | 'week' = 'month',
): CashFlowPeriod[] {
  const periods = new Map<string, { income: number; expenses: number }>();

  for (const tx of transactions) {
    const key = periodKey(tx.date, granularity);
    const period = periods.get(key) ?? { income: 0, expenses: 0 };
    if (tx.type === 'income') {
      period.income += tx.amount;
    } else {
      period.expenses += tx.amount;
    }
    periods.set(key, period);
  }

  return Array.from(periods.entries())
    .map(([period, data]) => ({
      period,
      income: data.income,
      expenses: data.expenses,
      net: data.income - data.expenses,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

export function spendingTrend(
  transactions: Transaction[],
  granularity: 'month' | 'week' = 'month',
): SpendingTrendPeriod[] {
  const expenses = transactions.filter((t) => t.type === 'expense');
  const periods = new Map<string, number>();

  for (const tx of expenses) {
    const key = periodKey(tx.date, granularity);
    periods.set(key, (periods.get(key) ?? 0) + tx.amount);
  }

  return Array.from(periods.entries())
    .map(([period, amount]) => ({ period, amount }))
    .sort((a, b) => a.period.localeCompare(b.period));
}
