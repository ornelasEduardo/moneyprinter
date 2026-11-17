import { render, screen, fireEvent, waitFor } from '@/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PaymentMatchModal from './PaymentMatchModal';
import { listPaymentCandidates, reconcilePayment } from '@/app/actions/payments';
vi.mock('@/app/actions/payments', () => ({ listPaymentCandidates: vi.fn(), reconcilePayment: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
describe('payment matching confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listPaymentCandidates).mockResolvedValue({ payments: [{ id: 9, accountName: 'Card', date: '2026-11-11', name: 'Payment received', amount: '50' }], transfers: [] } as never);
  });
  it('shows suggestions without automatically linking and requires confirmation', async () => {
    render(<PaymentMatchModal transactionId={1} accounts={[]} onClose={vi.fn()} />);
    const choice = await screen.findByRole('radio', { name: /Card.*Payment received/ });
    expect(reconcilePayment).not.toHaveBeenCalled();
    fireEvent.click(choice);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm match' }));
    await waitFor(() => expect(reconcilePayment).toHaveBeenCalledWith({ transactionId: 1, counterpartTransactionId: 9 }));
  });
  it('shows a server conflict and keeps the dialog open', async () => {
    vi.mocked(reconcilePayment).mockRejectedValue(new Error('Payment already linked. Refresh and try again.'));
    render(<PaymentMatchModal transactionId={1} accounts={[]} onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole('radio', { name: /Card.*Payment received/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm match' }));
    expect(await screen.findByText('Payment already linked. Refresh and try again.')).toBeVisible();
  });
});
