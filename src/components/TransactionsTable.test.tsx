import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TransactionsTable from './TransactionsTable';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import * as transactionActions from '@/app/actions/transactions';

// Mock server actions
vi.mock('@/app/actions/transactions', () => ({
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock Design System
vi.mock('@design-system', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">
      {children}
    </button>
  ),
  Card: ({ children }: any) => <div>{children}</div>,
  Flex: ({ children }: any) => <div>{children}</div>,
  Input: ({ value, onChange, placeholder, name, defaultValue }: any) => (
    <input 
      value={value} 
      defaultValue={defaultValue}
      onChange={onChange} 
      placeholder={placeholder}
      name={name}
      data-testid={`input-${name || placeholder}`}
    />
  ),
  Modal: ({ isOpen, children, title }: any) => (
    isOpen ? <div data-testid="modal"><h2>{title}</h2>{children}</div> : null
  ),
  Select: ({ value, onChange, options, name, defaultValue }: any) => (
    <select 
      value={value} 
      defaultValue={defaultValue}
      onChange={onChange} 
      name={name}
      data-testid={`select-${name || 'account'}`}
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  ),
  Table: ({ data, columns, toolbarContent }: any) => (
    <div>
      <div data-testid="toolbar">{toolbarContent}</div>
      <table>
        <thead>
          <tr>
            {columns.map((col: any) => <th key={col.header}>{col.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row: any) => (
            <tr key={row.id} data-testid="table-row">
              <td>{row.name}</td>
              <td>
                {/* Render actions column manually for testing */}
                <button onClick={() => columns.find((c: any) => c.id === 'actions').cell({ row: { original: row } })}>
                  Actions
                </button>
                {/* Render the actual cell content to access buttons */}
                 {columns.find((c: any) => c.id === 'actions').cell({ row: { original: row } })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
  Text: ({ children }: any) => <span>{children}</span>,
  useToast: () => ({
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
  }),
}));

describe('TransactionsTable', () => {
  const mockTransactions = [
    {
      id: 1,
      name: 'Grocery Store',
      amount: 150.50,
      date: '2024-01-15',
      tags: 'Food',
      type: 'expense',
      accountId: 1,
      accountName: 'Checking',
    },
    {
      id: 2,
      name: 'Paycheck',
      amount: 3000,
      date: '2024-01-30',
      tags: 'Salary',
      type: 'income',
      accountId: 1,
      accountName: 'Checking',
    },
  ];

  const mockAccounts = [
    { id: 1, name: 'Checking' },
    { id: 2, name: 'Savings' },
  ];

  it('should render transactions', () => {
    render(<TransactionsTable transactions={mockTransactions} selectedYear={2024} accounts={mockAccounts} />);
    
    expect(screen.getByText('Transactions (2024)')).toBeInTheDocument();
    expect(screen.getByText('Grocery Store')).toBeInTheDocument();
    expect(screen.getByText('Paycheck')).toBeInTheDocument();
  });

  it('should filter by account', () => {
    render(<TransactionsTable transactions={mockTransactions} selectedYear={2024} accounts={mockAccounts} />);
    
    // Initial state: all transactions
    expect(screen.getAllByTestId('table-row')).toHaveLength(2);
    
    // Filter by Checking (should still show both as both are Checking)
    fireEvent.change(screen.getByTestId('select-account'), { target: { value: 'Checking' } });
    expect(screen.getAllByTestId('table-row')).toHaveLength(2);
    
    // Filter by Savings (should show none)
    fireEvent.change(screen.getByTestId('select-account'), { target: { value: 'Savings' } });
    expect(screen.queryByTestId('table-row')).not.toBeInTheDocument();
  });

  it('should delete transaction', async () => {
    // Mock confirm
    window.confirm = vi.fn(() => true);
    
    render(<TransactionsTable transactions={mockTransactions} selectedYear={2024} accounts={mockAccounts} />);
    
    // Find delete button for first row (Grocery Store)
    // In our mock Table, we render the actions cell. The actions cell has 2 buttons.
    // The second one is delete.
    const rows = screen.getAllByTestId('table-row');
    const deleteButton = rows[0].querySelectorAll('button')[2]; // 0 is our debug action wrapper, 1 is edit, 2 is delete
    
    fireEvent.click(deleteButton);
    
    await waitFor(() => {
      expect(transactionActions.deleteTransaction).toHaveBeenCalledWith(1);
    });
  });
});
