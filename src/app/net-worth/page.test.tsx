import { render, screen } from '@testing-library/react';
import NetWorthPage from './page';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import * as authLib from '@/lib/auth';
import * as netWorthActions from '@/app/actions/networth';
import { redirect } from 'next/navigation';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/app/actions/networth', () => ({
  getNetWorthHistory: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@design-system', () => ({
  Page: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/NetWorthHistoryTable', () => ({
  default: ({ entries }: any) => (
    <div data-testid="history-table">
      {entries.map((e: any) => (
        <div key={e.id}>{e.date} - {e.netWorth}</div>
      ))}
    </div>
  ),
}));

describe('NetWorthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should redirect if not authenticated', async () => {
    (authLib.getCurrentUser as any).mockResolvedValue(null);
    
    await NetWorthPage();
    
    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('should render history table', async () => {
    (authLib.getCurrentUser as any).mockResolvedValue(123);
    (netWorthActions.getNetWorthHistory as any).mockResolvedValue([
      { id: 1, date: '2024-01-01', netWorth: 10000 },
    ]);

    const jsx = await NetWorthPage();
    render(jsx);

    expect(screen.getByText('Net Worth History')).toBeInTheDocument();
    expect(screen.getByTestId('history-table')).toBeInTheDocument();
    expect(screen.getByText('2024-01-01 - 10000')).toBeInTheDocument();
  });
});
