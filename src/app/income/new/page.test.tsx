import { render, screen } from '@testing-library/react';
import AddIncomePage from './page';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

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

vi.mock('@/app/actions/income', () => ({
  createIncomeSource: vi.fn(),
}));

vi.mock('doom-design-system', () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  Card: ({ children }: any) => <div>{children}</div>,
  Flex: ({ children }: any) => <div>{children}</div>,
  Input: ({ name, placeholder, type }: any) => (
    <input name={name} placeholder={placeholder} type={type} data-testid={`input-${name}`} />
  ),
  Page: ({ children }: any) => <div>{children}</div>,
  Select: ({ name, options }: any) => (
    <select name={name} data-testid={`select-${name}`}>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  ),
}));

describe('AddIncomePage', () => {
  it('should render form', () => {
    render(<AddIncomePage />);
    // Use getByRole for heading
    expect(screen.getByRole('heading', { name: 'Add Income Source' })).toBeInTheDocument();
    
    expect(screen.getByText('Income Name')).toBeInTheDocument();
    expect(screen.getByTestId('input-name')).toBeInTheDocument();
  });
});
