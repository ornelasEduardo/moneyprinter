import { describe, it, expect } from 'vitest';
import {
  accountSchema,
  transactionSchema,
  netWorthHistorySchema,
  incomeSourceSchema,
  incomeBudgetSchema,
  budgetLimitSchema,
  goalSchema,
  userSettingSchema,
} from './schemas';

describe('accountSchema', () => {
  it('should validate a valid account', () => {
    const result = accountSchema.safeParse({
      name: 'Chase Checking',
      type: 'checking',
      balance: '1500.50',
      currency: 'USD',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.balance).toBe(1500.50);
    }
  });

  it('should coerce string balance to number', () => {
    const result = accountSchema.safeParse({
      name: 'Savings',
      type: 'savings',
      balance: '2000',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.balance).toBe(2000);
    }
  });

  it('should reject missing name', () => {
    const result = accountSchema.safeParse({
      type: 'checking',
      balance: '100',
    });
    expect(result.success).toBe(false);
  });
});

describe('transactionSchema', () => {
  it('should validate a valid transaction', () => {
    const result = transactionSchema.safeParse({
      name: 'Grocery Store',
      amount: '45.99',
      date: '2026-03-15',
      type: 'expense',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(45.99);
      expect(result.data.date).toBeInstanceOf(Date);
    }
  });

  it('should reject invalid date', () => {
    const result = transactionSchema.safeParse({
      name: 'Test',
      amount: '10',
      date: 'not-a-date',
      type: 'expense',
    });
    expect(result.success).toBe(false);
  });
});

describe('netWorthHistorySchema', () => {
  it('should validate a valid entry', () => {
    const result = netWorthHistorySchema.safeParse({
      date: '2026-03-15',
      net_worth: '150000.00',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.net_worth).toBe(150000);
    }
  });
});

describe('incomeSourceSchema', () => {
  it('should validate a valid income source', () => {
    const result = incomeSourceSchema.safeParse({
      name: 'Primary Paycheck',
      type: 'paycheck',
      amount: '5000',
      frequency: 'bi-weekly',
    });
    expect(result.success).toBe(true);
  });

  it('should handle optional next_date', () => {
    const result = incomeSourceSchema.safeParse({
      name: 'Bonus',
      type: 'bonus',
      amount: '10000',
      frequency: 'monthly',
      next_date: '2026-06-15',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.next_date).toBeInstanceOf(Date);
    }
  });
});

describe('incomeBudgetSchema', () => {
  it('should validate a valid budget allocation', () => {
    const result = incomeBudgetSchema.safeParse({
      name: '401k',
      unit: 'percentage',
      value: '10',
      type: 'savings',
      increases_net_worth: 'true',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.value).toBe(10);
      expect(result.data.increases_net_worth).toBe(true);
    }
  });
});

describe('budgetLimitSchema', () => {
  it('should validate a valid budget limit', () => {
    const result = budgetLimitSchema.safeParse({
      category: 'Groceries',
      limit_amount: '500',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit_amount).toBe(500);
    }
  });
});

describe('goalSchema', () => {
  it('should validate a valid goal', () => {
    const result = goalSchema.safeParse({
      name: 'Emergency Fund',
      target_amount: '25000',
      current_amount: '15000',
      is_primary: 'true',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.target_amount).toBe(25000);
      expect(result.data.is_primary).toBe(true);
    }
  });
});

describe('userSettingSchema', () => {
  it('should validate a valid setting', () => {
    const result = userSettingSchema.safeParse({
      key: 'theme',
      value: 'doom',
    });
    expect(result.success).toBe(true);
  });
});

describe('goalSchema plan pairing', () => {
  it('rejects plan_kind without plan_inputs', () => {
    expect(goalSchema.safeParse({ name: 'x', target_amount: 1, plan_kind: 'mortgage' }).success).toBe(false);
  });
  it('accepts a plain goal', () => {
    expect(goalSchema.safeParse({ name: 'x', target_amount: 1 }).success).toBe(true);
  });
  it('rejects a malformed mortgage plan_inputs blob', () => {
    expect(goalSchema.safeParse({
      name: 'x', target_amount: 1, plan_kind: 'mortgage', plan_inputs: { homePrice: 'nope' },
    }).success).toBe(false);
  });
  it('accepts a valid mortgage plan_inputs blob', () => {
    const plan_inputs = {
      homePrice: 400000, downPayment: 80000, annualRatePct: 6, termYears: 30,
      propertyTaxAnnual: 4800, homeInsuranceAnnual: 1200, hoaMonthly: 0, pmiMonthly: 0, existingMonthlyDebt: 0,
    };
    expect(goalSchema.safeParse({ name: 'x', target_amount: 1, plan_kind: 'mortgage', plan_inputs }).success).toBe(true);
  });
});
