import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';

vi.mock('@/app/actions/analytics', () => ({
  getSpendingByCategory: vi.fn().mockResolvedValue([
    { category: 'groceries', amount: 150, percentage: 60, merchants: [] },
    { category: 'transport', amount: 100, percentage: 40, merchants: [] },
  ]),
  getCashFlow: vi.fn().mockResolvedValue([
    { period: '2026-03', income: 3200, expenses: 2000, net: 1200 },
  ]),
  getRecurringCharges: vi.fn().mockResolvedValue([]),
  getSpendingAnomalies: vi.fn().mockResolvedValue([]),
  getNetWorthTrend: vi.fn().mockResolvedValue([]),
}));

vi.mock('./SpendingChart', () => ({
  SpendingChart: (props: any) => <div data-testid="spending-chart">Spending Chart</div>,
}));

vi.mock('./CashFlowChart', () => ({
  CashFlowChart: (props: any) => <div data-testid="cashflow-chart">Cash Flow Chart</div>,
}));

vi.mock('./RecurringCharges', () => ({
  RecurringCharges: (props: any) => <div data-testid="recurring-charges">Recurring Charges</div>,
}));

vi.mock('./SpendingAnomalies', () => ({
  SpendingAnomalies: (props: any) => <div data-testid="anomalies">Anomalies</div>,
}));

vi.mock('./NetWorthTrend', () => ({
  NetWorthTrend: (props: any) => <div data-testid="net-worth-trend">Net Worth</div>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import AnalyticsOverview from './AnalyticsOverview';

describe('AnalyticsOverview', () => {
  it('should render overview sections', async () => {
    render(<AnalyticsOverview />);
    // TimeRangePicker renders
    expect(screen.getByText(/last 3 months/i)).toBeInTheDocument();
  });
});
