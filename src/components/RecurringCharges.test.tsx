import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import { RecurringCharges } from './RecurringCharges';
import type { RecurringCharge } from '@/lib/recurring';

const base: RecurringCharge = {
  name: 'netflix', amount: 19.99, frequency: 'monthly', confidence: 'high',
  lastCharged: new Date('2026-03-01'), nextExpected: new Date('2026-04-01'),
  transactions: 6, kind: 'subscription',
};

describe('RecurringCharges', () => {
  it('shows a price-hike badge when priceChange is present', () => {
    const charge: RecurringCharge = {
      ...base,
      priceChange: { previousAmount: 15.99, currentAmount: 19.99, changedAt: new Date('2026-03-01'), percentIncrease: 25 },
    };
    render(<RecurringCharges charges={[charge]} />);
    expect(screen.getAllByText(/\$15\.99.*\$19\.99/)).toHaveLength(2);
  });

  it('renders variable-kind charges without a price-hike badge', () => {
    render(<RecurringCharges charges={[{ ...base, kind: 'variable' }]} />);
    expect(screen.getAllByText('netflix')).toHaveLength(2);
    expect(screen.getAllByText('variable')).toHaveLength(2);
  });
});
