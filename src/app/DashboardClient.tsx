"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoalTracker } from "@/components/GoalTracker";
import NetWorthChart from "@/components/NetWorthChart";
import { Logo } from "@/components/Logo";
import AppHeader from "@/components/AppHeader";
import SummaryCards from "@/components/SummaryCards";
import ProjectionsTable from "@/components/ProjectionsTable";
import TransactionsTable from "@/components/TransactionsTable";
import AccountsTable from "@/components/AccountsTable";
import NetWorthHistoryTable from "@/components/NetWorthHistoryTable";
import { DashboardStoreProvider } from "@/lib/store";
import SettingsView from "@/components/SettingsView";
import HistoryTab from "@/components/HistoryTab";
import type { AuditEntryRow } from "@/components/HistoryTab";
import type { IntegrityWarning } from "@/lib/integrity";
import DataTab from "@/components/DataTab";
import type { BackupHistoryEntry } from "@/lib/constants";
import {
  ActionRow,
  Card,
  Flex,
  Sidebar,
  Text,
} from "doom-design-system";
import {
  Banknote,
  PieChart,
  Home,
  ArrowRightLeft,
  Wallet,
  TrendingUp,
  Clock,
  Database,
  Settings,
  Receipt,
} from "lucide-react";
import styles from "./DashboardClient.module.scss";

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
  auditEntries?: AuditEntryRow[];
  integrityWarnings?: IntegrityWarning[];
  backupHistory?: BackupHistoryEntry[];
  showBackupReminder?: boolean;
}


export default function DashboardClient(props: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState(
    props.selectedYear || currentYear
  );
  const [activeTab, setActiveTab] = useState(props.initialTab || "home");

  useEffect(() => {
    const year = parseInt(searchParams.get("year") || currentYear.toString());
    const tab = searchParams.get("tab") || "home";
    setSelectedYear(year);
    setActiveTab(tab);
    setActiveSection(tabToSection[tab] || 'overview');
  }, [searchParams, currentYear]);

  const handleYearChange = (year: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", year);
    router.push(`/?${params.toString()}`);
  };

  // Map tab IDs to their parent section
  const tabToSection: Record<string, string> = {
    home: 'overview',
    transactions: 'finance',
    accounts: 'finance',
    budget: 'finance',
    networth: 'finance',
    history: 'system',
    data: 'system',
    settings: 'system',
  };

  const [activeSection, setActiveSection] = useState(
    tabToSection[activeTab] || 'overview'
  );

  const handleNavigation = (href: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    const tab = href.replace("/", "");
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/?${params.toString()}`);
  };

  // Generate monthly projections for the selected year (Jan-Dec)
  const generateProjections = () => {
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const monthsToStartOfYear =
      (selectedYear - currentYear) * 12 - currentMonth;

    const januaryEntry = props.netWorthHistory.find((h) => {
      const [y, m] = h.date.split("-").map(Number);
      return y === selectedYear && m === 1;
    });

    const recordedStartNetWorth = januaryEntry?.netWorth;

    let startOfYearNetWorth: number;

    if (recordedStartNetWorth !== undefined) {
      startOfYearNetWorth = recordedStartNetWorth;
    } else {
      startOfYearNetWorth =
        props.netWorth + monthsToStartOfYear * props.monthlyNetWorthIncrease;
    }

    let currentTotal = startOfYearNetWorth;

    const monthlyData = monthNames.map((month, idx) => {
      const startTotal = currentTotal;

      const monthlyWindfalls = props.windfalls.filter((w) => {
        const [wYear, wMonth] = w.date.split("-").map(Number);
        return wYear === selectedYear && wMonth - 1 === idx;
      });

      const monthlyWindfallTotal = monthlyWindfalls.reduce(
        (sum, w) => sum + w.amount,
        0
      );

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
        newTotal: currentTotal,
        startTotal: startTotal,
        date: `${selectedYear}-${String(idx + 1).padStart(2, "0")}-01`,
      };
    });

    return { monthlyData, finalTotal: currentTotal };
  };

  const { monthlyData: projections, finalTotal } = generateProjections();

  const chartData = projections.map((p) => ({
    date: p.date,
    netWorth: p.startTotal,
  }));

  chartData.push({
    date: `${selectedYear + 1}-01-01`,
    netWorth: finalTotal,
  });

  function renderContent() {
    switch (activeTab) {
      case "home":
        return (
          <div className={styles.dashboardGrid}>
            <div className={styles.fullWidth}>
              <GoalTracker
                netWorth={props.netWorth}
                monthlySavings={props.monthlyNetWorthIncrease}
                goal={props.primaryGoal}
                emergencyFund={props.emergencyFund}
              />
            </div>
            <div className={styles.column}>
              <ProjectionsTable
                projections={projections}
                selectedYear={selectedYear}
                currentYear={currentYear}
                onYearChange={handleYearChange}
              />
            </div>
            <Flex direction="column" gap={6} className={styles.column}>
              <Card className={styles.chartCard}>
                <Text
                  variant="h5"
                  color="muted"
                  style={{ marginBottom: "1rem" }}
                >
                  Net Worth Over Time
                </Text>
                <div className={styles.chartContainer}>
                  <NetWorthChart data={chartData} />
                </div>
              </Card>
              <SummaryCards
                netWorth={props.netWorth}
                yearlySpending={props.yearlySpending}
                spendingPercentage={props.spendingPercentage}
                budget={props.budget}
                upcomingWindfalls={props.upcomingWindfalls}
                year={selectedYear}
              />
            </Flex>
          </div>
        );

      case "transactions":
        return (
          <TransactionsTable
            transactions={props.transactions}
            selectedYear={selectedYear}
            accounts={props.accounts}
          />
        );

      case "accounts":
        return <AccountsTable accounts={props.accounts} />;

      case "budget":
        return (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div className={styles.budgetHeader}>
              <Text variant="h3" weight="black">Budget</Text>
              <Text color="muted">
                Manage your income streams and budget allocations
              </Text>
            </div>
            <ActionRow
              icon={<Banknote size={24} strokeWidth={2.5} />}
              title="Income Sources"
              description="Add and manage your paychecks, bonuses, and other income streams"
              onClick={() => router.push(`/income/new?year=${selectedYear}`)}
            />
            <ActionRow
              icon={<PieChart size={24} strokeWidth={2.5} />}
              title="Budgets"
              description="Control how your income is distributed across savings and expenses"
              onClick={() => router.push(`/income/budgets?year=${selectedYear}`)}
            />
          </Card>
        );

      case "networth":
        return <NetWorthHistoryTable entries={props.netWorthHistory} />;

      case "history":
        return (
          <HistoryTab
            entries={props.auditEntries ?? []}
            warnings={props.integrityWarnings ?? []}
          />
        );

      case "data":
        return (
          <DataTab
            backupHistory={props.backupHistory ?? []}
            showBackupReminder={props.showBackupReminder ?? false}
            existingTransactions={props.transactions?.map(t => ({
              date: new Date(t.date),
              amount: t.amount,
              name: t.name,
            }))}
            accounts={props.accounts?.map(a => ({ id: a.id, name: a.name }))}
          />
        );

      case "settings":
        return <SettingsView />;

      default:
        return null;
    }
  }

  return (
    <DashboardStoreProvider {...props} selectedYear={selectedYear}>
      <div className={styles.layout}>
        <Sidebar
          withRail
          activeItem={`/${activeTab}`}
          activeSection={activeSection}
          onNavigate={handleNavigation}
          onSectionChange={setActiveSection}
          brandIcon={<Logo size={24} />}
        >
          <Sidebar.Header>
            <Text variant="h5" weight="black" className="uppercase">MoneyPrinter</Text>
          </Sidebar.Header>
          <Sidebar.Nav>
            <Sidebar.Section id="overview" label="Overview" icon={<Home size={20} strokeWidth={2.5} />}>
              <Sidebar.Item href="/home" icon={<Home size={18} strokeWidth={2.5} />}>Home</Sidebar.Item>
            </Sidebar.Section>
            <Sidebar.Section id="finance" label="Finance" icon={<Wallet size={20} strokeWidth={2.5} />}>
              <Sidebar.Item href="/transactions" icon={<ArrowRightLeft size={18} strokeWidth={2.5} />}>Transactions</Sidebar.Item>
              <Sidebar.Item href="/accounts" icon={<Wallet size={18} strokeWidth={2.5} />}>Accounts</Sidebar.Item>
              <Sidebar.Item href="/budget" icon={<Receipt size={18} strokeWidth={2.5} />}>Budget</Sidebar.Item>
              <Sidebar.Item href="/networth" icon={<TrendingUp size={18} strokeWidth={2.5} />}>Net Worth</Sidebar.Item>
            </Sidebar.Section>
            <Sidebar.Section id="system" label="System" icon={<Settings size={20} strokeWidth={2.5} />}>
              <Sidebar.Item href="/history" icon={<Clock size={18} strokeWidth={2.5} />}>History</Sidebar.Item>
              <Sidebar.Item href="/data" icon={<Database size={18} strokeWidth={2.5} />}>Data</Sidebar.Item>
              <Sidebar.Item href="/settings" icon={<Settings size={18} strokeWidth={2.5} />}>Settings</Sidebar.Item>
            </Sidebar.Section>
          </Sidebar.Nav>
        </Sidebar>

        <main className={styles.main}>
          <AppHeader
            user={props.user}
            selectedYear={selectedYear}
            availableYears={props.availableYears}
            onYearChange={handleYearChange}
          />
          <div className={styles.content}>
            {renderContent()}
          </div>
        </main>
      </div>
    </DashboardStoreProvider>
  );
}
