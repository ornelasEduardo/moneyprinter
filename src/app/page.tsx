import {
  getNetWorth,
  getUpcomingWindfalls,
  getProjectedNetWorthHistory,
  calculateMonthlyNetWorthIncrease,
  getWindfalls,
  getNetWorthHistoryForYear,
  getAccounts,
  getAvailableYears
} from "@/lib/data";
import { getRecentAuditLog } from "@/app/actions/audit";
import { runIntegrityChecks } from "@/lib/integrity";
import { getBackupHistory, getBackupReminderState } from "@/app/actions/backup";
import DashboardClient from "./DashboardClient";
import { getPrimaryGoal, getEmergencyFundAmount } from "@/app/actions/goals";
import { getCurrentUser } from "@/lib/auth";
import { getUser } from "@/app/actions/auth";
import { listMovements } from "@/lib/movements";
import { redirect } from "next/navigation";
import { Page } from 'doom-design-system';
export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<{ timeframe?: string; year?: string; tab?: string }> }) {
  // Check authentication
  const userId = await getCurrentUser();
  if (!userId) {
    redirect('/login');
  }

  // Await searchParams in Next.js 15
  const params = await searchParams;

  const user = await getUser();
  const netWorth = await getNetWorth();
  const upcomingWindfalls = await getUpcomingWindfalls();
  const monthlyNetWorthIncrease = await calculateMonthlyNetWorthIncrease();
  const windfalls = await getWindfalls();
  const primaryGoal = await getPrimaryGoal();
  const emergencyFund = await getEmergencyFundAmount();
  const accounts = await getAccounts();
  const availableYears = await getAvailableYears();
  const [auditEntries, integrityWarnings] = await Promise.all([
    getRecentAuditLog(),
    runIntegrityChecks(),
  ]);
  const [backupHistoryData, backupReminderState] = await Promise.all([
    getBackupHistory(),
    getBackupReminderState(),
  ]);
  const serializedAuditEntries = auditEntries.map((e) => ({
    ...e,
    created_at: e.created_at.toISOString(),
    undone_at: e.undone_at ? e.undone_at.toISOString() : null,
    previous_value: e.previous_value as Record<string, unknown> | null,
    new_value: e.new_value as Record<string, unknown> | null,
  }));

  // Get timeframe/year/tab from URL params
  const yearParam = params.year;
  const tabParam = params.tab;
  const currentYear = new Date().getFullYear();
  const selectedYear = yearParam ? parseInt(yearParam) : currentYear;
  const initialTab = tabParam || 'home';

  const rawMovements = await listMovements({ userId, year: selectedYear });
  const accountNameById = new Map(accounts.map((a) => [a.id, a.name]));

  const transactions = rawMovements.map((m) => {
    if (m.kind === 'transfer') {
      return {
        kind: 'transfer' as const,
        id: m.id,
        amount: m.amount,
        date: m.date.toISOString().slice(0, 10),
        note: m.note,
        tags: m.tags,
        from_account_id: m.from_account_id,
        to_account_id: m.to_account_id,
        fromAccountName: accountNameById.get(m.from_account_id),
        toAccountName: accountNameById.get(m.to_account_id),
      };
    }
    return {
      kind: m.kind,
      id: m.id,
      name: m.name,
      amount: m.amount,
      date: m.date.toISOString().slice(0, 10),
      tags: m.tags,
      type: m.kind,
      accountId: m.account_id,
      accountName: m.account_id ? accountNameById.get(m.account_id) : undefined,
    };
  });

  const timeframe = params.timeframe || '30';

  // Always get history for the selected year (defaults to current year)
  const netWorthHistory = await getNetWorthHistoryForYear(selectedYear);

  // Placeholder budget for now (Yearly)
  const budget = 30_000;

  const yearlySpending = transactions
    .filter((t) => t.kind === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const spendingPercentage = Math.min((yearlySpending / budget) * 100, 100);

  // Fetch projected history
  const projectedHistory = await getProjectedNetWorthHistory();

  return (
    <Page variant="fullWidth">
      <DashboardClient
        user={user}
        netWorth={netWorth}
        yearlySpending={yearlySpending}
        upcomingWindfalls={upcomingWindfalls}
        projectedNetWorthHistory={projectedHistory}
        spendingPercentage={spendingPercentage}
        budget={budget}
        currentTimeframe={timeframe}
        monthlyNetWorthIncrease={monthlyNetWorthIncrease}
        windfalls={windfalls}
        transactions={transactions}
        netWorthHistory={netWorthHistory}
        primaryGoal={primaryGoal}
        emergencyFund={emergencyFund}
        accounts={accounts}
        availableYears={availableYears}
        selectedYear={selectedYear}
        initialTab={initialTab}
        auditEntries={serializedAuditEntries}
        integrityWarnings={integrityWarnings}
        backupHistory={backupHistoryData}
        showBackupReminder={backupReminderState.show}
      />
    </Page>
  );
}
