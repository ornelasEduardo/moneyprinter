import { renderHook, act } from '@testing-library/react';
import { createDashboardStore, useDashboardStore, DashboardStoreProvider } from './store';
import { describe, it, expect } from 'vitest';
import React from 'react';

// Mock types
const mockProps: any = {
  user: { id: 1, username: 'testuser', display_name: 'Test User', is_sandbox: false },
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
};

describe('Dashboard Store', () => {
  it('should initialize with default values', () => {
    const store = createDashboardStore(mockProps);
    const state = store.getState();
    
    expect(state.netWorth).toBe(10000);
    expect(state.user).toEqual(mockProps.user);
  });

  it('should update state', () => {
    const store = createDashboardStore(mockProps);
    
    act(() => {
      store.setState({ netWorth: 15000 });
    });
    
    expect(store.getState().netWorth).toBe(15000);
  });
});

describe('useDashboardStore', () => {
  it('should provide state to components', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DashboardStoreProvider {...mockProps}>
        {children}
      </DashboardStoreProvider>
    );

    const { result } = renderHook(() => useDashboardStore((state) => state.netWorth), { wrapper });

    expect(result.current).toBe(10000);
  });
});
