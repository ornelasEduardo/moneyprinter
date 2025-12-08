import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GoalTracker } from './GoalTracker';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import * as goalActions from '@/app/actions/goals';

// Mock server actions
vi.mock('@/app/actions/goals', () => ({
  updatePrimaryGoal: vi.fn(),
  updateEmergencyFundAmount: vi.fn(),
}));

// Mock Design System components
vi.mock('doom-design-system', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">
      {children}
    </button>
  ),
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  Flex: ({ children }: any) => <div data-testid="flex">{children}</div>,
  Grid: ({ children }: any) => <div data-testid="grid">{children}</div>,
  Input: ({ label, value, onChange, type }: any) => (
    <label>
      {label}
      <input 
        type={type || 'text'} 
        value={value} 
        onChange={onChange} 
        data-testid={`input-${label.toLowerCase().replace(/\s+/g, '-')}`}
      />
    </label>
  ),
  ProgressBar: ({ value }: any) => <div data-testid="progress-bar" data-value={value} />,
  Text: ({ children }: any) => <span>{children}</span>,
}));

describe('GoalTracker', () => {
  const defaultProps = {
    netWorth: 50000,
    monthlySavings: 2000,
    goal: { name: 'Retirement', target_amount: 1000000 },
    emergencyFund: 10000,
  };

  it('should render view mode correctly', () => {
    render(<GoalTracker {...defaultProps} />);
    
    expect(screen.getByText('Goal Tracker: Retirement')).toBeInTheDocument();
    expect(screen.getByText('TO REACH GOAL')).toBeInTheDocument();
    
    // 50k net worth - 10k emergency = 40k available
    // 1M target - 40k = 960k remaining
    // 960k / 2k monthly = 480 months = 40 years
    expect(screen.getByText('40 YEARS')).toBeInTheDocument();
  });

  it('should switch to edit mode', () => {
    render(<GoalTracker {...defaultProps} />);
    
    // Find edit button (the pencil icon button)
    const editButton = screen.getAllByTestId('button')[0];
    fireEvent.click(editButton);
    
    expect(screen.getByText('Edit Goal Settings')).toBeInTheDocument();
    expect(screen.getByTestId('input-goal-name')).toHaveValue('Retirement');
    expect(screen.getByTestId('input-target-amount')).toHaveValue(1000000);
    expect(screen.getByTestId('input-emergency-fund-(reserved)')).toHaveValue(10000);
  });

  it('should save changes', async () => {
    render(<GoalTracker {...defaultProps} />);
    
    // Enter edit mode
    fireEvent.click(screen.getAllByTestId('button')[0]);
    
    // Change values
    fireEvent.change(screen.getByTestId('input-goal-name'), { target: { value: 'New Goal' } });
    fireEvent.change(screen.getByTestId('input-target-amount'), { target: { value: '2000000' } });
    
    // Save
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(goalActions.updatePrimaryGoal).toHaveBeenCalledWith('New Goal', 2000000);
      expect(goalActions.updateEmergencyFundAmount).toHaveBeenCalledWith(10000); // Unchanged
    });
  });
});
