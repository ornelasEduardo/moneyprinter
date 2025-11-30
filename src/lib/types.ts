import { Prisma } from '@prisma/client';

// Helper to convert Prisma Decimal/Date types to JSON-serializable types (number/string)
// This is useful for data passed from Server Components to Client Components
export type Serialized<T> = {
  [P in keyof T]: T[P] extends Prisma.Decimal
    ? number
    : T[P] extends Date
    ? string
    : T[P] extends Date | null
    ? string | null
    : T[P] extends Prisma.Decimal | null
    ? number | null
    : T[P] extends object
    ? Serialized<T[P]>
    : T[P];
};

// Re-export commonly used Prisma types for convenience
import { 
  users,
  accounts,
  transactions,
  income_sources,
  income_budgets,
  budget_limits,
  goals,
  net_worth_history,
  user_settings
} from '@prisma/client';

// Re-export commonly used Prisma types for convenience
export type User = users;
export type Account = accounts;
export type Transaction = transactions;
export type IncomeSource = income_sources;
export type IncomeBudget = income_budgets;
export type BudgetLimit = budget_limits;
export type Goal = goals;
export type NetWorthHistory = net_worth_history;
export type UserSetting = user_settings;

export type SafeUser = Pick<Serialized<User>, 'id' | 'username' | 'display_name' | 'is_sandbox'>;

export type SafeAccount = Serialized<Pick<Account, 'id' | 'name' | 'type' | 'balance' | 'currency' | 'last_updated'>>;
