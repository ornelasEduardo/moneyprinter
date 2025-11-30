'use client';

import React, { createContext, useContext, useRef, useEffect } from 'react';
import { createStore, useStore } from 'zustand';

import { Serialized, Transaction, SafeUser, SafeAccount } from '@/lib/types';

interface DashboardTransaction extends Serialized<Pick<Transaction, 'id' | 'name' | 'amount' | 'date' | 'tags' | 'type'>> {
  accountId: number | null;
  accountName?: string;
}

export interface DashboardProps {
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
  selectedYear?: number;
}

export type DashboardState = DashboardProps;

export type DashboardStore = ReturnType<typeof createDashboardStore>;

export const createDashboardStore = (initProps?: Partial<DashboardProps>) => {
  return createStore<DashboardState>()(() => ({
    user: null,
    netWorth: 0,
    yearlySpending: 0,
    upcomingWindfalls: [],
    netWorthHistory: [],
    spendingPercentage: 0,
    budget: 0,
    currentTimeframe: 'monthly',
    monthlyNetWorthIncrease: 0,
    windfalls: [],
    transactions: [],
    primaryGoal: null,
    emergencyFund: 0,
    accounts: [],
    availableYears: [],
    selectedYear: new Date().getFullYear(),
    ...initProps,
  }));
};

export const DashboardContext = createContext<DashboardStore | null>(null);

export function DashboardStoreProvider({
  children,
  ...props
}: React.PropsWithChildren<DashboardProps>) {
  const storeRef = useRef<DashboardStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createDashboardStore(props);
  }
  
  // Sync props to store after mount to avoid hydration errors
  useEffect(() => {
    if (storeRef.current) {
      storeRef.current.setState(props);
    }
  }, [props]);
  
  return (
    <DashboardContext.Provider value={storeRef.current}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardStore<T>(selector: (state: DashboardState) => T): T {
  const store = useContext(DashboardContext);
  if (!store) {
    throw new Error('Missing DashboardStoreProvider');
  }
  return useStore(store, selector);
}
