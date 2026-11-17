import { render, screen, fireEvent, waitFor } from '@/test-utils';
import { describe, it, expect, vi } from 'vitest';
import LinkedPayments from './LinkedPayments';
import { listLinkedPayments, unlinkPayment } from '@/app/actions/payments';
vi.mock('@/app/actions/payments', () => ({ listLinkedPayments: vi.fn(), unlinkPayment: vi.fn() }));
describe('linked statement entries', () => {
  it('shows posting dates and asks before unlinking', async () => {
    vi.mocked(listLinkedPayments).mockResolvedValue([{ id: 8, name: 'Card payment', accountName: 'Card', date: '2026-11-12', amount: '50' }] as never);
    render(<LinkedPayments transferId={1} onLoaded={vi.fn()} onUnlinked={vi.fn()} />);
    expect(await screen.findByText(/2026-11-12/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Unlink Card payment/ }));
    expect(unlinkPayment).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm unlink' }));
    await waitFor(() => expect(unlinkPayment).toHaveBeenCalledWith(8));
  });
});
