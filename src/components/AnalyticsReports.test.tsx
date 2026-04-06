import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';

vi.mock('@/app/actions/analytics', () => ({
  getSpendingByCategory: vi.fn().mockResolvedValue([]),
  getCashFlow: vi.fn().mockResolvedValue([]),
  getSpendingTrend: vi.fn().mockResolvedValue([]),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import AnalyticsReports from './AnalyticsReports';

describe('AnalyticsReports', () => {
  it('should render report cards', () => {
    render(<AnalyticsReports />);
    expect(screen.getByText(/monthly spending summary/i)).toBeInTheDocument();
    expect(screen.getByText(/income vs expenses/i)).toBeInTheDocument();
    expect(screen.getByText(/category breakdown/i)).toBeInTheDocument();
  });
});
