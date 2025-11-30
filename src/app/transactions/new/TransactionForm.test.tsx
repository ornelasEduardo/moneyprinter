import { render, screen, fireEvent } from '@testing-library/react';
import TransactionForm from './TransactionForm';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn((key) => {
      if (key === 'year') return '2024';
      return null;
    }),
  }),
}));

vi.mock('@/app/actions/transactions', () => ({
  createTransaction: vi.fn(),
}));

vi.mock('@design-system', () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  Card: ({ children }: any) => <div>{children}</div>,
  Form: ({ children, action }: any) => <form action={action}>{children}</form>,
  FormGroup: ({ children }: any) => <div>{children}</div>,
  Input: ({ name, placeholder, type }: any) => (
    <input name={name} placeholder={placeholder} type={type} data-testid={`input-${name}`} />
  ),
  Label: ({ children }: any) => <label>{children}</label>,
  Page: ({ children }: any) => <div>{children}</div>,
  Select: ({ name, options }: any) => (
    <select name={name} data-testid={`select-${name}`}>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  ),
}));

describe('TransactionForm', () => {
  const mockAccounts = [
    { id: 1, name: 'Checking' },
    { id: 2, name: 'Savings' },
  ];

  it('should render form with accounts', () => {
    render(<TransactionForm accounts={mockAccounts} />);
    
    expect(screen.getByRole('heading', { name: 'Add Transaction' })).toBeInTheDocument();
    expect(screen.getByTestId('input-name')).toBeInTheDocument();
    
    const accountSelect = screen.getByTestId('select-accountId');
    expect(accountSelect).toBeInTheDocument();
    expect(accountSelect.children.length).toBe(2);
    expect(accountSelect.children[0]).toHaveTextContent('Checking');
  });
});
