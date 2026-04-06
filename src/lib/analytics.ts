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

export interface MerchantSpending {
  merchant: string;
  amount: number;
  count: number;
}

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  merchants: MerchantSpending[];
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
  const categoryData = new Map<string, { total: number; merchants: Map<string, { amount: number; count: number }> }>();

  for (const tx of expenses) {
    const tags = splitTags(tx.tags);
    const categories = tags.length > 0 ? tags : ['uncategorized'];
    for (const category of categories) {
      const cat = categoryData.get(category) ?? { total: 0, merchants: new Map() };
      cat.total += tx.amount;
      const merchant = cat.merchants.get(tx.name) ?? { amount: 0, count: 0 };
      merchant.amount += tx.amount;
      merchant.count++;
      cat.merchants.set(tx.name, merchant);
      categoryData.set(category, cat);
    }
  }

  const total = Array.from(categoryData.values()).reduce((sum, c) => sum + c.total, 0);

  return Array.from(categoryData.entries())
    .map(([category, data]) => ({
      category,
      amount: data.total,
      percentage: total > 0 ? (data.total / total) * 100 : 0,
      merchants: Array.from(data.merchants.entries())
        .map(([merchant, m]) => ({ merchant, amount: m.amount, count: m.count }))
        .sort((a, b) => b.amount - a.amount),
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

export interface SpendingAnomaly {
  category: string;
  currentAmount: number;
  averageAmount: number;
  multiplier: number;
}

export function detectAnomalies(
  currentSpending: CategorySpending[],
  historicalTransactions: Transaction[],
  periodMonths: number,
): SpendingAnomaly[] {
  // Calculate historical monthly average per category
  const historicalByCategory = spendingByCategory(historicalTransactions);
  const historicalMonthlyAvg = new Map<string, number>();
  for (const cat of historicalByCategory) {
    historicalMonthlyAvg.set(cat.category, cat.amount / Math.max(periodMonths, 1));
  }

  // Current period's monthly rate (assume current period data represents ~1 month for comparison)
  const anomalies: SpendingAnomaly[] = [];
  for (const cat of currentSpending) {
    const avg = historicalMonthlyAvg.get(cat.category);
    if (!avg || avg < 10) continue; // skip tiny categories
    const multiplier = cat.amount / avg;
    if (multiplier >= 1.5) {
      anomalies.push({
        category: cat.category,
        currentAmount: cat.amount,
        averageAmount: avg,
        multiplier: Math.round(multiplier * 10) / 10,
      });
    }
  }

  return anomalies.sort((a, b) => b.multiplier - a.multiplier);
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
