import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@/test-utils';

vi.mock('@/app/actions/planning', () => ({
  resolvePlanContext: vi.fn(async () => ({
    defaults: {
      homePrice: 400000, downPayment: 80000, annualRatePct: 6, termYears: 30,
      propertyTaxAnnual: 4800, homeInsuranceAnnual: 1200, hoaMonthly: 0, pmiMonthly: 0, existingMonthlyDebt: 0,
    },
    // DELTA 1: include colThresholds — assessMortgage pulls this signal from the
    // snapshot via createSnapshotContext, which throws if it's missing.
    snapshot: { monthlyIncome: 8000, monthlySurplus: 2500, liquidBalance: 50000, netWorth: 120000, colThresholds: { front: 0.28, back: 0.36 } },
  })),
  saveGoalFromPlan: vi.fn(async () => ({ id: 7 })),
}));

import MortgageCalculator from './MortgageCalculator';

describe('MortgageCalculator', () => {
  it('pre-fills from resolved context and shows a monthly payment', async () => {
    render(<MortgageCalculator />);
    const price = await screen.findByTestId('mc-home-price');
    expect((price as HTMLInputElement).value).toBe('400000');
    await waitFor(() => expect(screen.getByTestId('mc-monthly-payment')).toHaveTextContent(/\$/));
  });

  it('recomputes when an input changes', async () => {
    render(<MortgageCalculator />);
    const payment = await screen.findByTestId('mc-monthly-payment');
    const before = payment.textContent;
    fireEvent.change(await screen.findByTestId('mc-home-price'), { target: { value: '600000' } });
    await waitFor(() => expect(screen.getByTestId('mc-monthly-payment').textContent).not.toBe(before));
  });

  it('saves as goal', async () => {
    const planning = await import('@/app/actions/planning');
    render(<MortgageCalculator />);
    await screen.findByTestId('mc-monthly-payment');
    fireEvent.click(screen.getByTestId('mc-save-goal'));
    await waitFor(() => expect(planning.saveGoalFromPlan).toHaveBeenCalledWith('mortgage', expect.any(Object), expect.any(Object)));
  });

  // DELTA 3: the active COL DTI limits (and their source) must be visible next
  // to the assessment, since they're what produced the verdict.
  it('shows the active cost-of-living DTI limits', async () => {
    render(<MortgageCalculator />);
    await waitFor(() => expect(screen.getByTestId('mc-col-note')).toHaveTextContent('28%'));
    expect(screen.getByTestId('mc-col-note')).toHaveTextContent('National guideline limits');
  });
});
