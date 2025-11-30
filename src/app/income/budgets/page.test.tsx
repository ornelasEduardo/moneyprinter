import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import IncomeBudgetPage from './page';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import * as budgetActions from '@/app/actions/budgets';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

vi.mock('@/app/actions/budgets', () => ({
  getIncomeSources: vi.fn(),
  getBudgetsForIncomeSource: vi.fn(),
  saveIncomeBudgets: vi.fn(),
}));

vi.mock('@design-system', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
  Card: ({ children }: any) => <div>{children}</div>,
  Flex: ({ children }: any) => <div>{children}</div>,
  Grid: ({ children }: any) => <div>{children}</div>,
  Input: ({ value, onChange, placeholder, type }: any) => (
    <input 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder} 
      type={type}
      data-testid={`input-${placeholder || 'generic'}`}
    />
  ),
  Page: ({ children }: any) => <div>{children}</div>,
  Select: ({ value, onChange, options }: any) => (
    <select value={value} onChange={onChange} data-testid="select">
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  ),
  Table: ({ data }: any) => (
    <div data-testid="budget-table">
      {data.map((row: any) => (
        <div key={row.id}>{row.name} - {row.value}</div>
      ))}
    </div>
  ),
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  TabsBody: ({ children }: any) => <div>{children}</div>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
  Textarea: ({ value, onChange }: any) => (
    <textarea value={value} onChange={onChange} data-testid="csv-editor" />
  ),
}));

describe('IncomeBudgetPage', () => {
  const mockSources = [
    { id: 1, name: 'Job', type: 'paycheck', amount: 5000 },
  ];
  const mockBudgets = {
    paycheckAmount: 5000,
    budgets: [
      { id: '1', name: 'Savings', unit: 'percentage', value: 20, type: 'savings', increasesNetWorth: true },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (budgetActions.getIncomeSources as any).mockResolvedValue(mockSources);
    (budgetActions.getBudgetsForIncomeSource as any).mockResolvedValue(mockBudgets);
  });

  it('should load and display data', async () => {
    render(<IncomeBudgetPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Income Budget')).toBeInTheDocument();
    });

    expect(screen.getByText('Savings - 20')).toBeInTheDocument();
  });

  it('should handle save', async () => {
    render(<IncomeBudgetPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Save Configuration')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save Configuration').closest('button');
    fireEvent.click(saveButton!);

    await waitFor(() => {
      expect(budgetActions.saveIncomeBudgets).toHaveBeenCalled();
    });
  });
});
