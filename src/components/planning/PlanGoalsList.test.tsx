import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@/test-utils';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), useSearchParams: () => new URLSearchParams() }));
vi.mock('@/app/actions/planning', () => ({ getPlanGoals: vi.fn() }));
import { getPlanGoals } from '@/app/actions/planning';
import PlanGoalsList from './PlanGoalsList';

describe('PlanGoalsList', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('lists saved plans and reopens one via /?tab=mortgage&goal=<id>', async () => {
    (getPlanGoals as any).mockResolvedValue([{ id: 7, name: 'House down payment', targetAmount: 80000, kind: 'mortgage' }]);
    render(<PlanGoalsList />);
    expect(await screen.findByText('House down payment')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pg-view-plan'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/?tab=mortgage&goal=7'));
  });

  it('shows an empty state when there are no saved plans', async () => {
    (getPlanGoals as any).mockResolvedValue([]);
    render(<PlanGoalsList />);
    expect(await screen.findByTestId('plan-goals-list')).toHaveTextContent(/no saved plans/i);
  });
});
