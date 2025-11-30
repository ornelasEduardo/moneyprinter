import { render, screen, fireEvent } from '@testing-library/react';
import AccountWizard from './page';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
  }),
}));

vi.mock('@/app/actions/accounts', () => ({
  createAccount: vi.fn(),
}));

vi.mock('@design-system', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
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

describe('AccountWizard', () => {
  it('should render step 1', () => {
    render(<AccountWizard />);
    // Use getByRole for heading to be more specific and robust
    expect(screen.getByRole('heading', { name: 'Add New Account' })).toBeInTheDocument();
    
    // Manual Entry is inside a button, let's find the button or the text
    // The text is inside a div inside the button
    expect(screen.getByText('Manual Entry')).toBeInTheDocument();
  });

  it('should navigate to step 2 manual entry', () => {
    render(<AccountWizard />);
    
    // Select Manual Entry
    fireEvent.click(screen.getByText('Manual Entry'));
    
    // Click Next
    fireEvent.click(screen.getByText('Next'));
    
    expect(screen.getByText('Account Name')).toBeInTheDocument();
    expect(screen.getByTestId('input-name')).toBeInTheDocument();
  });

  it('should show coming soon for auto import', () => {
    render(<AccountWizard />);
    
    expect(screen.getByText('Auto Import')).toBeInTheDocument();
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
  });
});
