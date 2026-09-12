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
const mockPlans = (p: unknown[]) => (getPlanGoals as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(p);

describe('PlanHub', () => {
  beforeEach(() => vi.clearAllMocks());

  it('surfaces the tools zone and an empty new-plan tile when there are no plans', async () => {
    mockPlans([]);
    render(<PlanHub {...baseProps} />);
    await screen.findByRole('button', { name: /Open Mortgage/ });
    // header CTA + the empty-state tile, both labelled "New plan"
    expect(screen.getAllByRole('button', { name: 'New plan' }).length).toBeGreaterThanOrEqual(2);
  });

  it('renders a saved plan (with its amount in the accessible name) and reopens it', async () => {
    mockPlans([{ id: 7, name: 'Austin condo', targetAmount: 70000, kind: 'mortgage', createdAt: 0 }]);
    render(<PlanHub {...baseProps} />);
    const tile = await screen.findByRole('button', { name: /View plan Austin condo, \$70,000 down payment/ });
    fireEvent.click(tile);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/?tab=mortgage&goal=7'));
  });

  it('opens the mortgage tool from its tile', async () => {
    mockPlans([]);
    render(<PlanHub {...baseProps} />);
    fireEvent.click(await screen.findByRole('button', { name: /Open Mortgage/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/?tab=mortgage'));
  });

  it('does not repeat the primary goal as a saved-plan tile', async () => {
    mockPlans([
      { id: 1, name: 'House Down Payment', targetAmount: 500000, kind: 'mortgage', createdAt: 0 },
      { id: 8, name: 'Austin condo', targetAmount: 70000, kind: 'mortgage', createdAt: 0 },
    ]);
    render(<PlanHub {...baseProps} />);
    expect(await screen.findByRole('button', { name: /View plan Austin condo/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /View plan House Down Payment/ })).not.toBeInTheDocument();
  });

  it('shows an error message (not a false "no plans") when the fetch fails', async () => {
    (getPlanGoals as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    render(<PlanHub {...baseProps} />);
    expect((await screen.findAllByText(/Couldn't load your saved plans/)).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Open Mortgage/ })).toBeInTheDocument();
  });

  it('renders a goal empty state instead of fabricated data when no primary goal exists', async () => {
    mockPlans([]);
    render(<PlanHub {...baseProps} goal={null} />);
    expect(await screen.findByText(/No goal set yet/)).toBeInTheDocument();
  });

  it('opens the view-all sheet and moves focus into it', async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      id: 100 + i, name: `Plan ${i}`, targetAmount: 1000 * (i + 1), kind: 'mortgage', createdAt: i,
    }));
    mockPlans(many);
    render(<PlanHub {...baseProps} />);
    fireEvent.click(await screen.findByRole('button', { name: /View all \(8\)/ }));
    const dialog = await screen.findByRole('dialog');
    // focus effect actually runs (regression: it was dead code) → lands inside the dialog
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  });
});
