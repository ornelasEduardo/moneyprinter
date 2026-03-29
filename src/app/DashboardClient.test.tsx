import { render, screen } from '@/test-utils';
import DashboardClient from './DashboardClient';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn((key) => {
      if (key === 'year') return '2024';
      if (key === 'tab') return 'home';
      return null;
    }),
    toString: () => '',
  }),
}));

vi.mock('@/components/GoalTracker', () => ({ GoalTracker: () => <div data-testid="goal-tracker" /> }));
vi.mock('@/components/NetWorthChart', () => ({ default: () => <div data-testid="net-worth-chart" /> }));
vi.mock('@/components/DashboardHeader', () => ({ default: () => <div data-testid="dashboard-header" /> }));
vi.mock('@/components/SummaryCards', () => ({ default: () => <div data-testid="summary-cards" /> }));
vi.mock('@/components/ProjectionsTable', () => ({ default: () => <div data-testid="projections-table" /> }));
vi.mock('@/components/TransactionsTable', () => ({ default: () => <div data-testid="transactions-table" /> }));
vi.mock('@/components/AccountsTable', () => ({ default: () => <div data-testid="accounts-table" /> }));
vi.mock('@/components/NetWorthHistoryTable', () => ({ default: () => <div data-testid="net-worth-history-table" /> }));
vi.mock('@/components/SettingsView', () => ({ default: () => <div data-testid="settings-view" /> }));

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
  it('should render the dashboard with sidebar and home content', () => {
    render(<DashboardClient {...mockProps} />);

    expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
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
