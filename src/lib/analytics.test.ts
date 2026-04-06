import { describe, it, expect } from 'vitest';
import { spendingByCategory, cashFlow, spendingTrend, type Transaction } from './analytics';

const mockTransactions: Transaction[] = [
  { id: 1, name: 'Whole Foods', amount: 85.50, date: '2026-03-01', type: 'expense', tags: 'Groceries', accountId: 1 },
  { id: 2, name: 'Shell', amount: 45.00, date: '2026-03-02', type: 'expense', tags: 'Transport', accountId: 1 },
  { id: 3, name: 'Trader Joes', amount: 72.00, date: '2026-03-05', type: 'expense', tags: 'Groceries', accountId: 1 },
  { id: 4, name: 'Netflix', amount: 15.99, date: '2026-03-03', type: 'expense', tags: 'Entertainment', accountId: 1 },
  { id: 5, name: 'Paycheck', amount: 3200.00, date: '2026-03-01', type: 'income', tags: 'Income', accountId: 1 },
  { id: 6, name: 'Lunch', amount: 12.00, date: '2026-03-04', type: 'expense', tags: null, accountId: 1 },
];

describe('spendingByCategory', () => {
  it('should group expenses by normalized tag', () => {
    const result = spendingByCategory(mockTransactions);
    const groceries = result.find((c) => c.category === 'groceries');
    expect(groceries).toBeDefined();
    expect(groceries!.amount).toBeCloseTo(157.50);
  });

  it('should exclude income transactions', () => {
    const result = spendingByCategory(mockTransactions);
    const income = result.find((c) => c.category === 'income');
    expect(income).toBeUndefined();
  });

  it('should put untagged transactions in "uncategorized"', () => {
    const result = spendingByCategory(mockTransactions);
    const uncat = result.find((c) => c.category === 'uncategorized');
    expect(uncat).toBeDefined();
    expect(uncat!.amount).toBeCloseTo(12.00);
  });

  it('should calculate percentages', () => {
    const result = spendingByCategory(mockTransactions);
    const percentSum = result.reduce((sum, c) => sum + c.percentage, 0);
    expect(percentSum).toBeCloseTo(100);
  });

  it('should sort by amount descending', () => {
    const result = spendingByCategory(mockTransactions);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].amount).toBeGreaterThanOrEqual(result[i].amount);
    }
  });

  it('should handle multi-tag transactions', () => {
    const txs: Transaction[] = [
      { id: 1, name: 'Work lunch', amount: 20, date: '2026-03-01', type: 'expense', tags: 'food, work', accountId: 1 },
    ];
    const result = spendingByCategory(txs);
    const food = result.find((c) => c.category === 'food');
    const work = result.find((c) => c.category === 'work');
    expect(food).toBeDefined();
    expect(work).toBeDefined();
    expect(food!.amount).toBe(20);
    expect(work!.amount).toBe(20);
  });

  it('should include merchant breakdown per category', () => {
    const result = spendingByCategory(mockTransactions);
    const groceries = result.find((c) => c.category === 'groceries');
    expect(groceries!.merchants).toHaveLength(2);
    expect(groceries!.merchants[0].merchant).toBe('Whole Foods');
    expect(groceries!.merchants[0].amount).toBeCloseTo(85.50);
    expect(groceries!.merchants[1].merchant).toBe('Trader Joes');
  });
});

const multiMonthTransactions: Transaction[] = [
  { id: 1, name: 'Paycheck', amount: 3200, date: '2026-01-15', type: 'income', tags: null, accountId: 1 },
  { id: 2, name: 'Rent', amount: 1500, date: '2026-01-01', type: 'expense', tags: 'Housing', accountId: 1 },
  { id: 3, name: 'Food', amount: 300, date: '2026-01-20', type: 'expense', tags: 'Groceries', accountId: 1 },
  { id: 4, name: 'Paycheck', amount: 3200, date: '2026-02-15', type: 'income', tags: null, accountId: 1 },
  { id: 5, name: 'Rent', amount: 1500, date: '2026-02-01', type: 'expense', tags: 'Housing', accountId: 1 },
  { id: 6, name: 'Food', amount: 350, date: '2026-02-18', type: 'expense', tags: 'Groceries', accountId: 1 },
  { id: 7, name: 'Paycheck', amount: 3200, date: '2026-03-15', type: 'income', tags: null, accountId: 1 },
  { id: 8, name: 'Rent', amount: 1500, date: '2026-03-01', type: 'expense', tags: 'Housing', accountId: 1 },
];

describe('cashFlow', () => {
  it('should group by month with income and expenses', () => {
    const result = cashFlow(multiMonthTransactions, 'month');
    expect(result).toHaveLength(3);
    expect(result[0].period).toBe('2026-01');
    expect(result[0].income).toBe(3200);
    expect(result[0].expenses).toBe(1800);
    expect(result[0].net).toBe(1400);
  });

  it('should sort periods chronologically', () => {
    const result = cashFlow(multiMonthTransactions, 'month');
    expect(result[0].period).toBe('2026-01');
    expect(result[1].period).toBe('2026-02');
    expect(result[2].period).toBe('2026-03');
  });

  it('should handle months with only income', () => {
    const txs: Transaction[] = [
      { id: 1, name: 'Paycheck', amount: 3200, date: '2026-04-15', type: 'income', tags: null, accountId: 1 },
    ];
    const result = cashFlow(txs, 'month');
    expect(result[0].income).toBe(3200);
    expect(result[0].expenses).toBe(0);
    expect(result[0].net).toBe(3200);
  });

  it('should handle empty transactions', () => {
    const result = cashFlow([], 'month');
    expect(result).toEqual([]);
  });
});

describe('spendingTrend', () => {
  it('should return monthly spending totals', () => {
    const result = spendingTrend(multiMonthTransactions, 'month');
    expect(result[0]).toEqual({ period: '2026-01', amount: 1800 });
    expect(result[1]).toEqual({ period: '2026-02', amount: 1850 });
  });

  it('should only include expenses', () => {
    const result = spendingTrend(multiMonthTransactions, 'month');
    const march = result.find((r) => r.period === '2026-03');
    expect(march!.amount).toBe(1500);
  });

  it('should sort chronologically', () => {
    const result = spendingTrend(multiMonthTransactions, 'month');
    for (let i = 1; i < result.length; i++) {
      expect(result[i].period > result[i - 1].period).toBe(true);
    }
  });
});
