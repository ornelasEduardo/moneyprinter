import { render, screen } from '@/test-utils';
import DashboardClient from './DashboardClient';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const nav = vi.hoisted(() => ({ tab: 'home' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn((key) => {
      if (key === 'year') return '2024';
      if (key === 'tab') return nav.tab;
      return null;
    }),
    toString: () => '',
  }),
}));

vi.mock('@/components/SidebarFooter', () => ({ default: () => <div data-testid="sidebar-footer" /> }));
vi.mock('@/components/GoalTracker', () => ({ GoalTracker: () => <div data-testid="goal-tracker" /> }));
vi.mock('@/components/NetWorthChart', () => ({ default: () => <div data-testid="net-worth-chart" /> }));
vi.mock('@/components/DashboardHeader', () => ({ default: () => <div data-testid="dashboard-header" /> }));
vi.mock('@/components/SummaryCards', () => ({ default: () => <div data-testid="summary-cards" /> }));
vi.mock('@/components/ProjectionsTable', () => ({ default: () => <div data-testid="projections-table" /> }));
vi.mock('@/components/TransactionsTable', () => ({ default: () => <div data-testid="transactions-table" /> }));
vi.mock('@/components/AccountsTable', () => ({ default: () => <div data-testid="accounts-table" /> }));
vi.mock('@/components/NetWorthHistoryTable', () => ({ default: () => <div data-testid="net-worth-history-table" /> }));
vi.mock('@/components/SettingsView', () => ({ default: () => <div data-testid="settings-view" /> }));
vi.mock('@/components/AnalyticsOverview', () => ({ default: () => <div data-testid="analytics-overview" /> }));
vi.mock('@/components/AnalyticsReports', () => ({ default: () => <div data-testid="analytics-reports" /> }));
vi.mock('@/components/planning/PlanHub', () => ({ default: () => <div data-testid="plan-hub" /> }));
vi.mock('@/components/planning/MortgageTab', () => ({ default: () => <div data-testid="mortgage-tab" /> }));

const mockProps: any = {
  user: { id: 1, username: 'test', display_name: 'Test', is_sandbox: false },
  netWorth: 10000,
  yearlySpending: 24000,
  upcomingWindfalls: [],
  netWorthHistory: [],
  spendingPercentage: 20,
  budget: 5000,
  currentTimeframe: 'monthly',
  monthlyNetWorthIncrease: 500,
  windfalls: [],
  transactions: [],
  primaryGoal: null,
  emergencyFund: 5000,
  accounts: [],
  availableYears: [2023, 2024],
  selectedYear: 2024,
  currentTheme: 'default',
};

describe('DashboardClient', () => {
  beforeEach(() => { nav.tab = 'home'; });

  it('renders the Plan hub on the plan tab and keeps Overview as the Plan section leaf', () => {
    nav.tab = 'plan';
    render(<DashboardClient {...mockProps} />);
    expect(screen.getByTestId('plan-hub')).toBeInTheDocument();
    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0);
  });

  it('renders the mortgage calculator on the mortgage tab', () => {
    nav.tab = 'mortgage';
    render(<DashboardClient {...mockProps} />);
    expect(screen.getByTestId('mortgage-tab')).toBeInTheDocument();
  });

  it('should render the dashboard with sidebar and home content', () => {
    render(<DashboardClient {...mockProps} />);

    expect(screen.getAllByText('MoneyPrinter').length).toBeGreaterThan(0);
    expect(screen.getByTestId('goal-tracker')).toBeInTheDocument();
    expect(screen.getByTestId('projections-table')).toBeInTheDocument();
  });

  it('should render sidebar navigation items', () => {
    render(<DashboardClient {...mockProps} />);

    expect(screen.getAllByText('Transactions').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Accounts').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);
  });
});
