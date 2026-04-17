import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import TransferModal from './TransferModal';
import { createTransfer, updateTransfer, deleteTransfer } from '@/app/actions/transfers';

vi.mock('@/app/actions/transfers', () => ({
  createTransfer: vi.fn(),
  updateTransfer: vi.fn(),
  deleteTransfer: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const accounts = [
  { id: 1, name: 'Checking' },
  { id: 2, name: 'Savings' },
];

describe('TransferModal — create', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not render when closed', () => {
    const { container } = render(
      <TransferModal isOpen={false} onClose={() => {}} accounts={accounts} />
    );
    expect(container).not.toHaveTextContent('Transfer');
  });

  it('renders the create form when open', () => {
    render(<TransferModal isOpen={true} onClose={() => {}} accounts={accounts} />);
    expect(screen.getByText(/new transfer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/from/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/to/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
  });

  it('submits form data to createTransfer', async () => {
    (createTransfer as any).mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<TransferModal isOpen={true} onClose={onClose} accounts={accounts} />);

    fireEvent.change(screen.getByLabelText(/from/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/to/i), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '250' } });
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2026-04-16' } });

    fireEvent.click(screen.getByRole('button', { name: /save|create/i }));

    await waitFor(() => expect(createTransfer).toHaveBeenCalled());
    const fd = (createTransfer as any).mock.calls[0][0] as FormData;
    expect(fd.get('fromAccountId')).toBe('1');
    expect(fd.get('toAccountId')).toBe('2');
    expect(fd.get('amount')).toBe('250');
    expect(fd.get('transferDate')).toBe('2026-04-16');
    expect(onClose).toHaveBeenCalled();
  });
});
