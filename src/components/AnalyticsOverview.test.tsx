import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';

vi.mock('@/app/actions/analytics', () => ({
  getSpendingByCategory: vi.fn().mockResolvedValue([
    { category: 'groceries', amount: 150, percentage: 60 },
    { category: 'transport', amount: 100, percentage: 40 },
  ]),
  getCashFlow: vi.fn().mockResolvedValue([
    { period: '2026-03', income: 3200, expenses: 2000, net: 1200 },
  ]),
  getRecurringCharges: vi.fn().mockResolvedValue([]),
}));

// Mock D3 for SpendingChart's SVG rendering
vi.mock('d3', () => ({
  select: vi.fn(() => ({
    selectAll: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
    append: vi.fn().mockReturnThis(),
    attr: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    data: vi.fn().mockReturnThis(),
    join: vi.fn().mockReturnThis(),
  })),
  pie: vi.fn(() => {
    const fn = vi.fn(() => []) as any;
    fn.value = vi.fn().mockReturnValue(fn);
    fn.sort = vi.fn().mockReturnValue(fn);
    return fn;
  }),
  arc: vi.fn(() => {
    const fn = vi.fn(() => '') as any;
    fn.innerRadius = vi.fn().mockReturnValue(fn);
    fn.outerRadius = vi.fn().mockReturnValue(fn);
    return fn;
  }),
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
