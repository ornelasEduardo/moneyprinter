import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { CashFlowChart } from './CashFlowChart';
import type { CashFlowPeriod } from '@/lib/analytics';

// Mock doom's Chart so the test exercises CashFlowChart's own logic without
// doom's real chart engine (which needs pointer/layout events happy-dom lacks).
vi.mock('doom-design-system', async (importOriginal) => {
  const actual = await importOriginal<typeof import('doom-design-system')>();
  const Chart = ({ children }: { children?: ReactNode }) => <div data-testid="chart">{children}</div>;
  return { ...actual, Chart };
});

const data: CashFlowPeriod[] = [
  { period: '2026-01', income: 5000, expenses: 3000, net: 2000 },
  { period: '2026-02', income: 6000, expenses: 3500, net: 2500 },
];

describe('CashFlowChart', () => {
  it('renders the heading and income/expense/net totals', () => {
    render(<CashFlowChart data={data} />);
    expect(screen.getByText('Cash Flow')).toBeInTheDocument();
    expect(screen.getByText('$11,000')).toBeInTheDocument(); // earned
    expect(screen.getByText('$6,500')).toBeInTheDocument();  // spent
    expect(screen.getByText('+$4,500')).toBeInTheDocument(); // net
  });

  it('always mounts the chart (never gated behind data, to avoid doom late-mount breakage)', () => {
    render(<CashFlowChart data={[]} />);
    expect(screen.getByTestId('chart')).toBeInTheDocument();
    expect(screen.getByText(/no cash flow data/i)).toBeInTheDocument();
  });
});
