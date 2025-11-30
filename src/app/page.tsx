import { 
  getNetWorth,
  getUpcomingWindfalls,
  getProjectedNetWorthHistory,
  calculateMonthlyNetWorthIncrease,
  getWindfalls,
  getTransactionsForYear,
  getNetWorthHistoryForYear,
  getAccounts,
  getAvailableYears
} from "@/lib/data";
import DashboardClient from "./DashboardClient";
import { getPrimaryGoal, getEmergencyFundAmount } from "@/app/actions/goals";
import { getCurrentUser } from "@/lib/auth";
import { getUser } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { Page } from '@design-system';
import { getThemePreference } from "@/lib/themes/actions";

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
  const currentTheme = await getThemePreference();

  // Get timeframe/year/tab from URL params
  const yearParam = params.year;
  const tabParam = params.tab;
  const currentYear = new Date().getFullYear();
  const selectedYear = yearParam ? parseInt(yearParam) : currentYear;
  const initialTab = tabParam || 'home';

  const transactions = await getTransactionsForYear(selectedYear);

  const timeframe = params.timeframe || '30';

  // Always get history for the selected year (defaults to current year)
  const netWorthHistory = await getNetWorthHistoryForYear(selectedYear);

  // Placeholder budget for now (Yearly)
  const budget = 30_000;
  
  const yearlySpending = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const spendingPercentage = Math.min((yearlySpending / budget) * 100, 100);

  // Fetch projected history
  const projectedHistory = await getProjectedNetWorthHistory();

  return (
    <Page>
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
        currentTheme={currentTheme}
        initialTab={initialTab}
      />
    </Page>
  );
}
