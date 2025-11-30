import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignupPage from './page';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import * as authActions from '@/app/actions/auth';

// Mock server actions
vi.mock('@/app/actions/auth', () => ({
  signup: vi.fn(),
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
      data-testid={`input-${placeholder}`}
    />
  ),
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  Page: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
}));

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render signup form', () => {
    render(<SignupPage />);
    expect(screen.getByText('New Account')).toBeInTheDocument();
    expect(screen.getByTestId('input-CHOOSE USERNAME')).toBeInTheDocument();
  });

  it('should handle signup submission', async () => {
    render(<SignupPage />);
    
    const usernameInput = screen.getByTestId('input-CHOOSE USERNAME');
    const displayInput = screen.getByTestId('input-YOUR DISPLAY NAME');
    const passwordInput = screen.getByTestId('input-CREATE PASSWORD');
    const confirmInput = screen.getByTestId('input-CONFIRM PASSWORD');
    const submitButton = screen.getByText('CREATE ACCOUNT').closest('button');

    fireEvent.change(usernameInput, { target: { value: 'newuser' } });
    fireEvent.change(displayInput, { target: { value: 'New User' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });
    
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(authActions.signup).toHaveBeenCalledWith('newuser', 'New User', 'password123');
    });
  });

  it('should show error if passwords do not match', async () => {
    render(<SignupPage />);
    
    const usernameInput = screen.getByTestId('input-CHOOSE USERNAME');
    const displayInput = screen.getByTestId('input-YOUR DISPLAY NAME');
    const passwordInput = screen.getByTestId('input-CREATE PASSWORD');
    const confirmInput = screen.getByTestId('input-CONFIRM PASSWORD');
    const submitButton = screen.getByText('CREATE ACCOUNT').closest('button');

    fireEvent.change(usernameInput, { target: { value: 'newuser' } });
    fireEvent.change(displayInput, { target: { value: 'New User' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'mismatch' } });
    
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(screen.getByText('PASSWORDS DO NOT MATCH')).toBeInTheDocument();
    });
    expect(authActions.signup).not.toHaveBeenCalled();
  });
});
