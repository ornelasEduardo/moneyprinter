/** Transaction purpose is independent of a statement's debit/credit sign. */
export const TRANSACTION_TYPES = ['income', 'expense', 'refund', 'payment_in', 'payment_out'] as const;
export type TransactionType = typeof TRANSACTION_TYPES[number];

const labels: Record<TransactionType, string> = {
  income: 'Income',
  expense: 'Expense',
  refund: 'Refund',
  payment_in: 'Account payment — money arriving',
  payment_out: 'Account payment — money leaving',
};

export const transactionTypeOptions = TRANSACTION_TYPES.map((value) => ({ value, label: labels[value] }));

export function isPaymentType(type: string | null | undefined): type is 'payment_in' | 'payment_out' {
  return type === 'payment_in' || type === 'payment_out';
}

/** Preserve legacy signed expenses; new refunds always reverse their magnitude. */
export function expenseContribution(type: string | null | undefined, amount: number): number {
  if (type === 'refund') return -Math.abs(amount);
  return type === 'expense' || type == null ? amount : 0;
}

export function incomeContribution(type: string | null | undefined, amount: number): number {
  return type === 'income' ? amount : 0;
}
