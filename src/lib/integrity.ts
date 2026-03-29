import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export type IntegrityWarningType = 'orphaned_transaction' | 'orphaned_budget' | 'duplicate_entry';

export interface IntegrityWarning {
  type: IntegrityWarningType;
  message: string;
  entityType: string;
  entityId: number;
}

export async function runIntegrityChecks(): Promise<IntegrityWarning[]> {
  const userId = await getCurrentUser();
  if (!userId) return [];

  const warnings: IntegrityWarning[] = [];

  const orphanedTransactions = await prisma.$queryRaw<{ id: number; account_id: number }[]>`
    SELECT t.id, t.account_id
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    WHERE t.user_id = ${userId}
      AND t.deleted_at IS NULL
      AND (a.id IS NULL OR a.deleted_at IS NOT NULL)
      AND t.account_id IS NOT NULL
  `;

  for (const row of orphanedTransactions) {
    warnings.push({
      type: 'orphaned_transaction',
      message: `Transaction #${row.id} references account #${row.account_id} which no longer exists`,
      entityType: 'transactions',
      entityId: row.id,
    });
  }

  const orphanedBudgets = await prisma.$queryRaw<{ id: number; income_source_id: number }[]>`
    SELECT b.id, b.income_source_id
    FROM income_budgets b
    LEFT JOIN income_sources s ON b.income_source_id = s.id
    WHERE b.user_id = ${userId}
      AND (s.id IS NULL OR s.deleted_at IS NOT NULL)
      AND b.income_source_id IS NOT NULL
  `;

  for (const row of orphanedBudgets) {
    warnings.push({
      type: 'orphaned_budget',
      message: `Income budget #${row.id} references income source #${row.income_source_id} which no longer exists`,
      entityType: 'income_budgets',
      entityId: row.id,
    });
  }

  const duplicates = await prisma.$queryRaw<{ date: string; count: number }[]>`
    SELECT date::text, COUNT(*)::int as count
    FROM net_worth_history
    WHERE user_id = ${userId} AND deleted_at IS NULL
    GROUP BY date
    HAVING COUNT(*) > 1
  `;

  for (const row of duplicates) {
    warnings.push({
      type: 'duplicate_entry',
      message: `Multiple net worth entries found for ${row.date}`,
      entityType: 'net_worth_history',
      entityId: 0,
    });
  }

  return warnings;
}
