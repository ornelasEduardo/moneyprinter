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
