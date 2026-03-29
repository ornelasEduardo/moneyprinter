import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import HistoryClient from './HistoryClient';

vi.mock('@/app/actions/audit', () => ({
  undoEntry: vi.fn(),
  undoEntryBatch: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockEntries = [
  {
    id: 1,
    entity_type: 'accounts',
    entity_id: 10,
    action: 'CREATE',
    batch_id: null,
    previous_value: null,
    new_value: { name: 'Savings', balance: 1000 },
    created_at: '2026-03-28T12:00:00Z',
    undone_at: null,
  },
  {
    id: 2,
    entity_type: 'transactions',
    entity_id: 20,
    action: 'UPDATE',
    batch_id: null,
    previous_value: { amount: 50 },
    new_value: { amount: 75 },
    created_at: '2026-03-28T11:00:00Z',
    undone_at: null,
  },
  {
    id: 3,
    entity_type: 'accounts',
    entity_id: 11,
    action: 'DELETE',
    batch_id: null,
    previous_value: { name: 'Old Account' },
    new_value: null,
    created_at: '2026-03-28T10:00:00Z',
    undone_at: '2026-03-28T10:05:00Z',
  },
];

const mockWarnings = [
  {
    type: 'orphaned_transaction' as const,
    message: 'Transaction #5 references a deleted account',
    entityType: 'transactions',
    entityId: 5,
  },
];

describe('HistoryClient', () => {
  it('should render audit log entries', () => {
    render(<HistoryClient entries={mockEntries} warnings={[]} />);

    expect(screen.getAllByText(/accounts/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CREATE/i).length).toBeGreaterThan(0);
  });

  it('should render integrity warnings when present', () => {
    render(<HistoryClient entries={[]} warnings={mockWarnings} />);

    expect(screen.getByText(/Transaction #5/)).toBeInTheDocument();
  });

  it('should render empty state when no entries', () => {
    render(<HistoryClient entries={[]} warnings={[]} />);

    expect(screen.getByText(/no activity/i)).toBeInTheDocument();
  });

  it('should render undo buttons only for non-undone entries', () => {
    render(<HistoryClient entries={mockEntries} warnings={[]} />);

    // 2 entries are not undone, 1 is undone
    const undoButtons = screen.getAllByRole('button', { name: /undo/i });
    expect(undoButtons.length).toBe(2);
  });

  it('should show undone badge for undone entries', () => {
    render(<HistoryClient entries={mockEntries} warnings={[]} />);

    expect(screen.getByText('undone')).toBeInTheDocument();
  });
});
