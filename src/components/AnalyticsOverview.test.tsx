import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test-utils';

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
  getNetWorthTrend: vi.fn().mockResolvedValue({ history: [] }),
  getSpendingFilterOptions: vi.fn().mockResolvedValue({
    accounts: [{ id: 42, name: 'Checking' }],
    tags: ['food'],
  }),
}));

vi.mock('doom-design-system', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    Combobox: ({ onChange, placeholder, options }: {
      onChange?: (v: string | string[]) => void;
      placeholder?: string;
      options?: { value: string; label: string }[];
      [key: string]: unknown;
    }) => (
      <div>
        <span>{placeholder}</span>
        {options?.map((opt) => (
          <button
            key={opt.value}
            data-testid={`combobox-option-${opt.value}`}
            onClick={() => onChange?.([opt.value])}
          >
            {opt.label}
          </button>
        ))}
      </div>
    ),
  };
});

vi.mock('./SpendingChart', () => ({
  SpendingChart: () => <div data-testid="spending-chart">Spending Chart</div>,
}));

vi.mock('./CashFlowChart', () => ({
  CashFlowChart: () => <div data-testid="cashflow-chart">Cash Flow Chart</div>,
}));

vi.mock('./RecurringCharges', () => ({
  RecurringCharges: () => <div data-testid="recurring-charges">Recurring Charges</div>,
}));

vi.mock('./SpendingAnomalies', () => ({
  SpendingAnomalies: () => <div data-testid="anomalies">Anomalies</div>,
}));

vi.mock('./NetWorthTrend', () => ({
  NetWorthTrend: () => <div data-testid="net-worth-trend">Net Worth</div>,
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

  it('renders account and tag filter placeholders', async () => {
    render(<AnalyticsOverview />);
    expect(await screen.findByText('All accounts')).toBeInTheDocument();
    expect(await screen.findByText('All tags')).toBeInTheDocument();
  });

  it('filter change refetches only spending; other sections and filter controls stay mounted', async () => {
    const analytics = await import('@/app/actions/analytics');
    const getSpending = vi.mocked(analytics.getSpendingByCategory);
    const getCashFlow = vi.mocked(analytics.getCashFlow);
    const getRecurring = vi.mocked(analytics.getRecurringCharges);
    const getAnomalies = vi.mocked(analytics.getSpendingAnomalies);
    const getNetWorth = vi.mocked(analytics.getNetWorthTrend);

    render(<AnalyticsOverview />);

    // Wait for initial full load to complete (spending chart appears)
    await screen.findByTestId('spending-chart');

    // Capture call counts after initial load
    const spendingCallsAfterMount = getSpending.mock.calls.length;
    expect(spendingCallsAfterMount).toBeGreaterThanOrEqual(1);
    const cashFlowCalls = getCashFlow.mock.calls.length;
    const recurringCalls = getRecurring.mock.calls.length;
    const anomalyCalls = getAnomalies.mock.calls.length;
    const netWorthCalls = getNetWorth.mock.calls.length;

    // Trigger account filter change by clicking the Combobox option
    const accountOption = await screen.findByTestId('combobox-option-42');
    fireEvent.click(accountOption);

    // Only spending should be refetched
    await waitFor(() => {
      expect(getSpending.mock.calls.length).toBe(spendingCallsAfterMount + 1);
    });

    // Other sections must NOT have been called again
    expect(getCashFlow.mock.calls.length).toBe(cashFlowCalls);
    expect(getRecurring.mock.calls.length).toBe(recurringCalls);
    expect(getAnomalies.mock.calls.length).toBe(anomalyCalls);
    expect(getNetWorth.mock.calls.length).toBe(netWorthCalls);

    // Filter controls remain in the document (not replaced by "Loading...")
    expect(screen.getByText('All accounts')).toBeInTheDocument();
    expect(screen.getByText('All tags')).toBeInTheDocument();

    // Second spending call used the new filter arg
    expect(getSpending).toHaveBeenLastCalledWith(
      expect.any(Date),
      expect.any(Date),
      { accountIds: [42], tags: [] },
    );
  });

  it('shows an error state instead of misleading zeros when the initial load fails', async () => {
    const analytics = await import('@/app/actions/analytics');
    vi.mocked(analytics.getCashFlow).mockRejectedValueOnce(new Error('boom'));

    render(<AnalyticsOverview />);

    // The headline shows an error, never the withheld 0% / $0 figures.
    expect(await screen.findByTestId('sc-error')).toBeInTheDocument();
    expect(screen.queryByTestId('sc-earned')).not.toBeInTheDocument();
  });
});
