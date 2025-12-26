"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styled from "@emotion/styled";
import { GoalTracker } from "@/components/GoalTracker";
import NetWorthChart from "@/components/NetWorthChart";
import DashboardHeader from "@/components/DashboardHeader";
import SummaryCards from "@/components/SummaryCards";
import ProjectionsTable from "@/components/ProjectionsTable";
import TransactionsTable from "@/components/TransactionsTable";
import AccountsTable from "@/components/AccountsTable";
import NetWorthHistoryTable from "@/components/NetWorthHistoryTable";
import { DashboardStoreProvider } from "@/lib/store";
import SettingsView from "@/components/SettingsView";
import {
  ActionRow,
  Card,
  Flex,
  Tabs,
  TabsBody,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from "doom-design-system";
import { Banknote, PieChart } from "lucide-react";

import { Serialized, Transaction, SafeUser, SafeAccount } from "@/lib/types";

interface DashboardTransaction
  extends Serialized<
    Pick<Transaction, "id" | "name" | "amount" | "date" | "tags" | "type">
  > {
  accountId: number | null;
  accountName?: string;
}

interface DashboardClientProps {
  user: SafeUser | null;
  netWorth: number;
  yearlySpending: number;
  upcomingWindfalls: any[];
  netWorthHistory: { id: number; date: string; netWorth: number }[];
  spendingPercentage: number;
  budget: number;
  currentTimeframe: string;
  monthlyNetWorthIncrease: number;
  windfalls: { name: string; amount: number; date: string; type: string }[];
  transactions: DashboardTransaction[];
  primaryGoal: { name: string; target_amount: number } | null;
  emergencyFund: number;
  accounts: SafeAccount[];
  availableYears: number[];
  projectedNetWorthHistory?: { id?: number; date: string; netWorth: number }[];
  selectedYear?: number;
  initialTab?: string;
}

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(400px, 1fr) 2fr;
  gap: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

export default function DashboardClient(props: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState(
    props.selectedYear || currentYear
  );
  const [activeTab, setActiveTab] = useState(props.initialTab || "home");

  // Sync URL params to state when they change
  useEffect(() => {
    const year = parseInt(searchParams.get("year") || currentYear.toString());
    const tab = searchParams.get("tab") || "home";
    setSelectedYear(year);
    setActiveTab(tab);
  }, [searchParams, currentYear]);

  const handleYearChange = (year: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", year);
    router.push(`/?${params.toString()}`);
  };

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/?${params.toString()}`);
  };

  // Generate monthly projections for the selected year (Jan-Dec)
  const generateProjections = () => {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Calculate net worth at the start of the selected year
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-11

    // Calculate months difference between now and Jan 1st of selected year
    const monthsToStartOfYear =
      (selectedYear - currentYear) * 12 - currentMonth;

    // Base net worth at Jan 1st of selected year
    // Try to find a recorded net worth for January of selected year
    const januaryEntry = props.netWorthHistory.find((h) => {
      // Parse date manually to avoid timezone issues
      const [y, m] = h.date.split("-").map(Number);
      return y === selectedYear && m === 1; // m is 1-based in split
    });

    const recordedStartNetWorth = januaryEntry?.netWorth;

    // If we have a recorded start, use it. Otherwise calculate from current.
    let startOfYearNetWorth: number;

    if (recordedStartNetWorth !== undefined) {
      startOfYearNetWorth = recordedStartNetWorth;
    } else {
      // Fallback: Calculate from current net worth
      startOfYearNetWorth =
        props.netWorth + monthsToStartOfYear * props.monthlyNetWorthIncrease;
    }

    // Track running total for iterative calculation
    let currentTotal = startOfYearNetWorth;

    const monthlyData = monthNames.map((month, idx) => {
      // Capture value at start of month
      const startTotal = currentTotal;

      // Find windfalls for this month
      const monthlyWindfalls = props.windfalls.filter((w) => {
        const [wYear, wMonth] = w.date.split("-").map(Number);
        return wYear === selectedYear && wMonth - 1 === idx;
      });

      const monthlyWindfallTotal = monthlyWindfalls.reduce(
        (sum, w) => sum + w.amount,
        0
      );

      // Find transactions for this month
      const monthlyTransactions = props.transactions.filter((t) => {
        const [tYear, tMonth] = t.date.split("-").map(Number);
        return tYear === selectedYear && tMonth - 1 === idx;
      });

      const monthlyExpenseTotal = monthlyTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      const monthlyIncomeTotal = monthlyTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      // Update total for end of month: + Income + Windfalls + Extra Income - Expenses
      const monthlyChange =
        props.monthlyNetWorthIncrease +
        monthlyWindfallTotal +
        monthlyIncomeTotal -
        monthlyExpenseTotal;
      currentTotal += monthlyChange;

      return {
        label: month,
        change: monthlyChange,
        windfalls: monthlyWindfallTotal,
        newTotal: currentTotal, // End of month value (for table)
        startTotal: startTotal, // Start of month value (for chart)
        // Manually construct YYYY-MM-DD to avoid timezone shifts
        date: `${selectedYear}-${String(idx + 1).padStart(2, "0")}-01`,
      };
    });

    return { monthlyData, finalTotal: currentTotal };
  };

  const { monthlyData: projections, finalTotal } = generateProjections();

  // Generate chart data from projections
  // We use startTotal to align with "Jan 1", "Feb 1" dates
  const chartData = projections.map((p) => ({
    date: p.date,
    netWorth: p.startTotal,
  }));

  // Add one final data point for the end of the year (Jan 1st of next year)
  // so the chart shows the full year's growth
  chartData.push({
    date: `${selectedYear + 1}-01-01`,
    netWorth: finalTotal,
  });

  return (
    <DashboardStoreProvider {...props} selectedYear={selectedYear}>
      <div className="dashboard">
        <DashboardHeader
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
        />

        <div style={{ marginBottom: "2rem" }}>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="home">Home</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
              <TabsTrigger value="budget">Budget</TabsTrigger>
              <TabsTrigger value="networth">Net Worth</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsBody>
              <TabsContent value="home">
                {/* Main Layout: Projections (Left) vs Chart & Cards (Right) */}
                <DashboardGrid>
                  {/* Goal Tracker (Spans Full Width) */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <GoalTracker
                      netWorth={props.netWorth}
                      monthlySavings={props.monthlyNetWorthIncrease}
                      goal={props.primaryGoal}
                      emergencyFund={props.emergencyFund}
                    />
                  </div>

                  {/* Left Column: Projections Table */}
                  <div style={{ minWidth: 0, height: "100%" }}>
                    <ProjectionsTable
                      projections={projections}
                      selectedYear={selectedYear}
                      currentYear={currentYear}
                      onYearChange={handleYearChange}
                    />
                  </div>

                  {/* Right Column: Chart + Summary Cards */}
                  <Flex
                    direction="column"
                    gap={6}
                    style={{ height: "100%", minWidth: 0 }}
                  >
                    {/* Net Worth Chart */}
                    <Card
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        minHeight: "400px",
                        minWidth: 0,
                      }}
                    >
                      <Text
                        variant="h5"
                        color="muted"
                        style={{ marginBottom: "1rem" }}
                      >
                        Net Worth Over Time
                      </Text>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <NetWorthChart data={chartData} />
                      </div>
                    </Card>

                    {/* Summary Cards Row */}
                    <SummaryCards
                      netWorth={props.netWorth}
                      yearlySpending={props.yearlySpending}
                      spendingPercentage={props.spendingPercentage}
                      budget={props.budget}
                      upcomingWindfalls={props.upcomingWindfalls}
                      year={selectedYear}
                    />
                  </Flex>
                </DashboardGrid>
              </TabsContent>

              <TabsContent value="transactions">
                <TransactionsTable
                  transactions={props.transactions}
                  selectedYear={selectedYear}
                  accounts={props.accounts}
                />
              </TabsContent>

              <TabsContent value="accounts">
                <AccountsTable accounts={props.accounts} />
              </TabsContent>

              <TabsContent value="budget">
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  {/* Header */}
                  <div
                    style={{
                      padding: "1.5rem",
                      borderBottom:
                        "var(--border-width) solid var(--card-border)",
                    }}
                  >
                    <Text variant="h3" weight="black">
                      Budget
                    </Text>
                    <Text color="muted">
                      Manage your income streams and budget allocations
                    </Text>
                  </div>

                  <ActionRow
                    icon={<Banknote size={24} strokeWidth={2.5} />}
                    title="Income Sources"
                    description="Add and manage your paychecks, bonuses, and other income streams"
                    onClick={() =>
                      router.push(`/income/new?year=${selectedYear}`)
                    }
                  />

                  <ActionRow
                    icon={<PieChart size={24} strokeWidth={2.5} />}
                    title="Budgets"
                    description="Control how your income is distributed across savings and expenses"
                    onClick={() =>
                      router.push(`/income/budgets?year=${selectedYear}`)
                    }
                  />
                </Card>
              </TabsContent>

              <TabsContent value="networth">
                <NetWorthHistoryTable entries={props.netWorthHistory} />
              </TabsContent>

              <TabsContent value="settings">
                <SettingsView />
              </TabsContent>
            </TabsBody>
          </Tabs>
        </div>
      </div>
    </DashboardStoreProvider>
  );
}
