import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@/test-utils';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app/actions/planning', () => ({ getPlanGoals: vi.fn() }));
import { getPlanGoals } from '@/app/actions/planning';
import PlanHub from './PlanHub';

const goal = { id: 1, name: 'House Down Payment', target_amount: 500000, plan_kind: 'mortgage' };
const baseProps = { goal, emergencyFund: 30000, netWorth: 150000, monthlySavings: 2000, monthlyExpenses: 9500 };

describe('PlanHub', () => {
  beforeEach(() => vi.clearAllMocks());

  it('surfaces the tools zone and an empty "save a plan" affordance when there are no plans', async () => {
    (getPlanGoals as any).mockResolvedValue([]);
    render(<PlanHub {...baseProps} />);
    expect(await screen.findByLabelText('Save a new plan')).toBeInTheDocument();
    expect(screen.getByLabelText('Open Mortgage')).toBeInTheDocument();
  });

  it('renders saved plans and reopens one at /?tab=mortgage&goal=<id>', async () => {
    (getPlanGoals as any).mockResolvedValue([
      { id: 7, name: 'Austin condo', targetAmount: 70000, kind: 'mortgage', createdAt: Date.parse('2026-09-01') },
    ]);
    render(<PlanHub {...baseProps} />);
    fireEvent.click(await screen.findByLabelText('Open plan Austin condo'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/?tab=mortgage&goal=7'));
  });

  it('opens the mortgage tool from its tile', async () => {
    (getPlanGoals as any).mockResolvedValue([]);
    render(<PlanHub {...baseProps} />);
    fireEvent.click(await screen.findByLabelText('Open Mortgage'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/?tab=mortgage'));
  });
});
