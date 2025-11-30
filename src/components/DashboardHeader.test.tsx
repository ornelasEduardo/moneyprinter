import { render, screen, fireEvent } from '@testing-library/react';
import DashboardHeader from './DashboardHeader';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import * as authActions from '@/app/actions/auth';
import * as store from '@/lib/store';

// Mock server actions
vi.mock('@/app/actions/auth', () => ({
  logout: vi.fn(),
}));

// Mock Design System
vi.mock('@design-system', () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  Flex: ({ children }: any) => <div>{children}</div>,
  Select: ({ value, onChange, options }: any) => (
    <select value={value} onChange={onChange} data-testid="year-select">
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  ),
  Text: ({ children }: any) => <span>{children}</span>,
}));

// Mock store
vi.mock('@/lib/store', () => ({
  useDashboardStore: vi.fn(),
}));

describe('DashboardHeader', () => {
  it('should render header with user info', () => {
    (store.useDashboardStore as any).mockImplementation((selector: any) => {
      const state = {
        user: { display_name: 'Test User', is_sandbox: false },
        availableYears: [2023, 2024],
      };
      return selector(state);
    });

    render(<DashboardHeader selectedYear={2024} onYearChange={() => {}} />);
    
    expect(screen.getByText('MoneyPrinter')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('should handle year change', () => {
    (store.useDashboardStore as any).mockImplementation((selector: any) => {
      const state = {
        user: { display_name: 'Test User', is_sandbox: false },
        availableYears: [2023, 2024],
      };
      return selector(state);
    });

    const handleYearChange = vi.fn();
    render(<DashboardHeader selectedYear={2024} onYearChange={handleYearChange} />);
    
    const select = screen.getByTestId('year-select');
    fireEvent.change(select, { target: { value: '2023' } });
    
    expect(handleYearChange).toHaveBeenCalledWith('2023');
  });

  it('should call logout', () => {
    (store.useDashboardStore as any).mockImplementation((selector: any) => {
      const state = {
        user: { display_name: 'Test User', is_sandbox: false },
        availableYears: [2023, 2024],
      };
      return selector(state);
    });

    render(<DashboardHeader selectedYear={2024} onYearChange={() => {}} />);
    
    const logoutButton = screen.getByText('Logout').closest('button');
    fireEvent.click(logoutButton!);
    
    expect(authActions.logout).toHaveBeenCalled();
  });
});
