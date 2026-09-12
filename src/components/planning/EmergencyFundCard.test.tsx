import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import { EmergencyFundCard } from './EmergencyFundCard';

describe('EmergencyFundCard', () => {
  it('shows the amount, months covered, and a status label', () => {
    render(<EmergencyFundCard target={30000} monthlyExpenses={9500} />);
    expect(screen.getByText('$30,000')).toBeInTheDocument();
    expect(screen.getByText(/3\.2 months of expenses covered/)).toBeInTheDocument();
    expect(screen.getByText('Covered')).toBeInTheDocument();
  });

  it('reads "Well covered" at six-plus months', () => {
    render(<EmergencyFundCard target={60000} monthlyExpenses={9500} />);
    expect(screen.getByText('Well covered')).toBeInTheDocument();
  });

  it('reads "Building" below three months', () => {
    render(<EmergencyFundCard target={10000} monthlyExpenses={9500} />);
    expect(screen.getByText('Building')).toBeInTheDocument();
  });

  it('omits the months line (no NaN) when there is no expense data', () => {
    render(<EmergencyFundCard target={30000} monthlyExpenses={0} />);
    expect(screen.getByText('$30,000')).toBeInTheDocument();
    expect(screen.queryByText(/months of expenses/)).not.toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it('shows a setup prompt when no target is set', () => {
    render(<EmergencyFundCard target={0} monthlyExpenses={9500} />);
    expect(screen.getByText(/Set an emergency-fund target/)).toBeInTheDocument();
  });
});
