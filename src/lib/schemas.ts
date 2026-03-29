import { z } from 'zod';

const coerceNumber = z.coerce.number();
const coerceDate = z.coerce.date();
const coerceBoolean = z.union([
  z.boolean(),
  z.string().transform((v) => v === 'true' || v === '1'),
]);

export const accountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  balance: coerceNumber,
  currency: z.string().default('USD'),
  plaid_id: z.string().nullable().optional(),
  last_updated: coerceDate.optional(),
});

export const transactionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: coerceNumber,
  date: coerceDate,
  tags: z.string().nullable().optional(),
  type: z.string().default('expense'),
  pending: coerceBoolean.default(false),
  account_id: coerceNumber.optional(),
  plaid_transaction_id: z.string().nullable().optional(),
});

export const netWorthHistorySchema = z.object({
  date: coerceDate,
  net_worth: coerceNumber,
});

export const incomeSourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().default('paycheck'),
  amount: coerceNumber,
  frequency: z.string().min(1, 'Frequency is required'),
  next_date: coerceDate.nullable().optional(),
});

export const incomeBudgetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  unit: z.enum(['percentage', 'fixed']),
  value: coerceNumber,
  type: z.enum(['savings', 'investment', 'expense']),
  increases_net_worth: coerceBoolean.default(true),
  income_source_id: coerceNumber.optional(),
});

export const budgetLimitSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  limit_amount: coerceNumber,
});

export const goalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  target_amount: coerceNumber,
  current_amount: coerceNumber.default(0),
  is_primary: coerceBoolean.default(false),
  target_date: coerceDate.nullable().optional(),
});

export const userSettingSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.string(),
});

export type AccountImport = z.infer<typeof accountSchema>;
export type TransactionImport = z.infer<typeof transactionSchema>;
export type NetWorthHistoryImport = z.infer<typeof netWorthHistorySchema>;
export type IncomeSourceImport = z.infer<typeof incomeSourceSchema>;
export type IncomeBudgetImport = z.infer<typeof incomeBudgetSchema>;
export type BudgetLimitImport = z.infer<typeof budgetLimitSchema>;
export type GoalImport = z.infer<typeof goalSchema>;
export type UserSettingImport = z.infer<typeof userSettingSchema>;

export const entitySchemas: Record<string, z.ZodSchema> = {
  accounts: accountSchema,
  transactions: transactionSchema,
  net_worth_history: netWorthHistorySchema,
  income_sources: incomeSourceSchema,
  income_budgets: incomeBudgetSchema,
  budget_limits: budgetLimitSchema,
  goals: goalSchema,
  user_settings: userSettingSchema,
};
