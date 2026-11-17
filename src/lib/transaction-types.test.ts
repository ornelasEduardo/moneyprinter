import { describe, expect, it } from 'vitest';
import { expenseContribution, incomeContribution, isPaymentType, TRANSACTION_TYPES, transactionTypeOptions } from './transaction-types';

describe('transaction accounting contributions', () => {
  it.each([
    ['expense', 100, 100, 0],
    ['expense', -30, -30, 0],
    ['refund', 30, -30, 0],
    ['refund', -30, -30, 0],
    ['income', 1000, 0, 1000],
    ['payment_in', 500, 0, 0],
    ['payment_out', 500, 0, 0],
    ['transfer', 500, 0, 0],
    [null, 10, 10, 0],
  ])('%s amount %s contributes correctly', (type, amount, expense, income) => {
    expect(expenseContribution(type, amount)).toBe(expense);
    expect(incomeContribution(type, amount)).toBe(income);
  });

  it('recognizes payment directions and exposes every registered type to forms', () => {
    expect(isPaymentType('payment_in')).toBe(true);
    expect(isPaymentType('payment_out')).toBe(true);
    expect(isPaymentType('refund')).toBe(false);
    expect(transactionTypeOptions.map((option) => option.value)).toEqual([...TRANSACTION_TYPES]);
  });
});
