import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './page';
import React from 'react';

// Mock dependencies
vi.mock('@/lib/data', () => ({
  getNetWorth: vi.fn(),
  getMonthlySpending: vi.fn(),
  getUpcomingWindfalls: vi.fn(),
  getProjectedNetWorthHistory: vi.fn(),
  calculateMonthlyNetWorthIncrease: vi.fn(),
  getWindfalls: vi.fn(),
  getTransactionsForYear: vi.fn(),
  getNetWorthHistoryForYear: vi.fn(),
  getAccounts: vi.fn(),
  getAvailableYears: vi.fn(),
}));

vi.mock('@/app/actions/goals', () => ({
  getPrimaryGoal: vi.fn(),
  getEmergencyFundAmount: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/app/actions/auth', () => ({
  getUser: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('doom-design-system', () => ({
  Page: ({ children }: any) => <div data-testid="page">{children}</div>,
}));

// Mock DashboardClient to verify props
vi.mock('./DashboardClient', () => ({
  default: (props: any) => (
    <div data-testid="dashboard-client">
      <span data-testid="user-prop">{props.user?.display_name}</span>
      <span data-testid="net-worth-prop">{props.netWorth}</span>
    </div>
  ),
}));

import * as dataLib from '@/lib/data';
import * as authLib from '@/lib/auth';
import * as authActions from '@/app/actions/auth';
import * as goalActions from '@/app/actions/goals';
import { redirect } from 'next/navigation';

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should redirect if not authenticated', async () => {
    (authLib.getCurrentUser as any).mockResolvedValue(null);

    // We need to await the component as it is async
    try {
      await Home({ searchParams: Promise.resolve({}) });
    } catch (e) {
      // redirect throws an error in Next.js, so we catch it
      // But in our mock, it's just a function.
      // However, if the component awaits it, it might not throw if we just mock it to return void.
    }

    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('should render dashboard if authenticated', async () => {
    (authLib.getCurrentUser as any).mockResolvedValue(123);
    (authActions.getUser as any).mockResolvedValue({ display_name: 'Test User' });
    (dataLib.getNetWorth as any).mockResolvedValue(50000);
    (dataLib.getMonthlySpending as any).mockResolvedValue(2000);
    (dataLib.getUpcomingWindfalls as any).mockResolvedValue([]);
    (dataLib.getProjectedNetWorthHistory as any).mockResolvedValue([]);
    (dataLib.calculateMonthlyNetWorthIncrease as any).mockResolvedValue(1000);
    (dataLib.getWindfalls as any).mockResolvedValue([]);
    (dataLib.getTransactionsForYear as any).mockResolvedValue([]);
    (dataLib.getNetWorthHistoryForYear as any).mockResolvedValue([]);
    (dataLib.getAccounts as any).mockResolvedValue([]);
    (dataLib.getAvailableYears as any).mockResolvedValue([2024]);
    (goalActions.getPrimaryGoal as any).mockResolvedValue(null);
    (goalActions.getEmergencyFundAmount as any).mockResolvedValue(0);
    (goalActions.getEmergencyFundAmount as any).mockResolvedValue(0);

    const jsx = await Home({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByTestId('page')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-client')).toBeInTheDocument();
    expect(screen.getByTestId('user-prop')).toHaveTextContent('Test User');
    expect(screen.getByTestId('net-worth-prop')).toHaveTextContent('50000');
  });
});
