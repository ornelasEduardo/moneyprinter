import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { NetWorthTrend } from './NetWorthTrend';

// Mock doom's Chart composition so the test exercises NetWorthTrend's own logic
// (heading, toggles, readouts, empty state) without doom's real chart engine,
// which needs pointer/layout events happy-dom can't provide.
vi.mock('doom-design-system', async (importOriginal) => {
  const actual = await importOriginal<typeof import('doom-design-system')>();
  const Chart = Object.assign(
    ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    {
      Root: ({ children }: { children?: ReactNode }) => <div data-testid="chart-root">{children}</div>,
      Series: () => null,
    },
  ) as unknown as typeof actual.Chart;
  return { ...actual, Chart };
});

const history = [
  { date: '2026-01-01', netWorth: 1000 },
  { date: '2026-02-01', netWorth: 2000 },
];
const projections = {
  regression: [{ date: '2026-03-01', netWorth: 3000, projected: true }],
  savingsRate: [{ date: '2026-03-01', netWorth: 2500, projected: true }],
};

describe('NetWorthTrend', () => {
  it('renders the net worth heading', () => {
    render(<NetWorthTrend data={history} projections={projections} />);
    expect(screen.getByText('Net Worth')).toBeInTheDocument();
  });

  it('mounts the chart even before data is available (avoids doom late-mount hover breakage)', () => {
    render(<NetWorthTrend data={[]} projections={{ regression: [], savingsRate: [] }} />);
    // The chart body is always mounted, never gated behind data availability.
    expect(screen.getByTestId('chart-root')).toBeInTheDocument();
  });

  it('renders both projection mode toggles when there is history', () => {
    render(<NetWorthTrend data={history} projections={projections} />);
    expect(screen.getByText('Trend')).toBeInTheDocument();
    expect(screen.getByText('Savings rate')).toBeInTheDocument();
  });

  it('shows the "not enough history" message when history has under 2 points', () => {
    render(<NetWorthTrend data={[history[0]]} projections={{ regression: [], savingsRate: [] }} />);
    expect(screen.getByText(/not enough net worth history/i)).toBeInTheDocument();
    // Toggles are hidden without enough history.
    expect(screen.queryByText('Trend')).not.toBeInTheDocument();
  });

  it('shows the latest net worth value and delta in the headline', () => {
    render(<NetWorthTrend data={history} projections={projections} />);
    // history: 1000 → 2000, delta +$1,000, latest $2,000
    const readout = screen.getByTestId('delta-readout');
    expect(readout).toHaveTextContent('+$1,000');
    expect(readout).toHaveTextContent('$2,000');
  });
});
