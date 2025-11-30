import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './page';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import * as authActions from '@/app/actions/auth';

// Mock server actions
vi.mock('@/app/actions/auth', () => ({
  login: vi.fn(),
}));

// Mock Design System
vi.mock('@design-system', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
  Card: ({ children }: any) => <div>{children}</div>,
  Flex: ({ children }: any) => <div>{children}</div>,
  Input: ({ value, onChange, placeholder, type }: any) => (
    <input 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder} 
      type={type}
      data-testid={`input-${type}`}
    />
  ),
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  Page: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
}));

describe('LoginPage', () => {
  it('should render login form', () => {
    render(<LoginPage />);
    expect(screen.getByText('MoneyPrinter')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ENTER USERNAME')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ENTER PASSWORD')).toBeInTheDocument();
  });

  it('should handle login submission', async () => {
    render(<LoginPage />);
    
    const usernameInput = screen.getByTestId('input-text');
    const passwordInput = screen.getByTestId('input-password');
    const submitButton = screen.getByText('ACCESS TERMINAL').closest('button');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(authActions.login).toHaveBeenCalledWith('testuser', 'password123');
    });
  });

  it('should handle demo mode', async () => {
    render(<LoginPage />);
    
    const demoButton = screen.getByText('DEMO MODE').closest('button');
    fireEvent.click(demoButton!);
    
    // Demo mode fills inputs. We need to check if inputs have values.
    // In our mock Input, we pass value prop.
    // Wait, the state updates, so the input value should update.
    
    const usernameInput = screen.getByTestId('input-text');
    const passwordInput = screen.getByTestId('input-password');
    
    expect(usernameInput).toHaveValue('sandbox');
    expect(passwordInput).toHaveValue('moneyprinter_sandbox');
  });

  it('should display error on login failure', async () => {
    (authActions.login as any).mockResolvedValue({ error: 'Invalid credentials' });
    
    render(<LoginPage />);
    
    const usernameInput = screen.getByTestId('input-text');
    const passwordInput = screen.getByTestId('input-password');
    const submitButton = screen.getByText('ACCESS TERMINAL').closest('button');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(screen.getByText('INVALID CREDENTIALS')).toBeInTheDocument();
    });
  });
});
