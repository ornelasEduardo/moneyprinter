import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccountsTable from './AccountsTable';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import * as accountActions from '@/app/actions/accounts';

// Mock server actions
vi.mock('@/app/actions/accounts', () => ({
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock Design System
vi.mock('doom-design-system', () => ({
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
  Table: ({ data, columns }: any) => (
    <div>
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

describe('AccountsTable', () => {
  const mockAccounts = [
    {
      id: 1,
      name: 'Checking',
      type: 'checking',
      balance: 5000,
      currency: 'USD',
      last_updated: '2024-01-01T12:00:00Z',
    },
    {
      id: 2,
      name: 'Savings',
      type: 'savings',
      balance: 10000,
      currency: 'USD',
      last_updated: '2024-01-01T12:00:00Z',
    },
  ];

  it('should render accounts', () => {
    render(<AccountsTable accounts={mockAccounts} />);
    
    expect(screen.getByText('Accounts')).toBeInTheDocument();
    expect(screen.getByText('Checking')).toBeInTheDocument();
    expect(screen.getByText('Savings')).toBeInTheDocument();
  });

  it('should delete account', async () => {
    // Mock confirm
    window.confirm = vi.fn(() => true);
    
    render(<AccountsTable accounts={mockAccounts} />);
    
    // Find delete button for first row
    const rows = screen.getAllByTestId('table-row');
    const deleteButton = rows[0].querySelectorAll('button')[2]; // 0 is debug wrapper, 1 is edit, 2 is delete
    
    fireEvent.click(deleteButton);
    
    await waitFor(() => {
      expect(accountActions.deleteAccount).toHaveBeenCalledWith(1);
    });
  });

  it('should open edit modal', () => {
    render(<AccountsTable accounts={mockAccounts} />);
    
    // Find edit button for first row
    const rows = screen.getAllByTestId('table-row');
    const editButton = rows[0].querySelectorAll('button')[1]; // 0 is debug wrapper, 1 is edit
    
    fireEvent.click(editButton);
    
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Edit Account')).toBeInTheDocument();
    expect(screen.getByTestId('input-name')).toHaveValue('Checking');
  });
});
