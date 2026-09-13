import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@/test-utils';
import CategorizationWorkspace from './CategorizationWorkspace';
import type { StreamSuggestion } from '@/lib/llm/useCategorizationStream';

// happy-dom reports a 0-height scroll container, so the real virtualizer renders
// no items. Mock it to render every item — grouping/apply logic is what we test
// here; the real virtualizer is verified in the browser.
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 68,
    getVirtualItems: () => Array.from({ length: count }, (_, index) => ({ key: index, index, start: index * 68 })),
    measureElement: () => {},
  }),
}));

const R = (id: number, name: string, amount: number, category: string, confidence: number): StreamSuggestion =>
  ({ id, name, amount, category, confidence });

const ROWS: StreamSuggestion[] = [
  R(1, 'TRADER JOES', -62, 'groceries', 0.95),
  R(2, 'SAFEWAY', -40, 'groceries', 0.9),
  R(3, 'SHELL OIL', -30, 'transportation', 0.99),
  R(4, 'SKETCHY LLC', -12, 'other', 0.4), // low confidence — needs review
];

const noop = () => {};

function renderWorkspace(rows: StreamSuggestion[], onApply = vi.fn()) {
  render(
    <CategorizationWorkspace
      rows={rows}
      streaming={false}
      progress={{ done: rows.length, total: rows.length }}
      busy={false}
      onApply={onApply}
      onCancel={noop}
    />,
  );
  return onApply;
}

describe('CategorizationWorkspace', () => {
  beforeEach(() => vi.clearAllMocks());

  it('groups suggestions by suggested category', () => {
    renderWorkspace(ROWS);
    const groups = screen.getAllByTestId('llm-group');
    expect(groups).toHaveLength(3); // groceries, transportation, other
    // biggest group (groceries, 2) sorts first
    expect(groups[0]).toHaveTextContent('groceries');
    expect(groups[0]).toHaveTextContent('2 ·');
  });

  it('"Apply high-confidence" applies only rows at or above 85%', () => {
    const onApply = renderWorkspace(ROWS);
    fireEvent.click(screen.getByTestId('llm-apply-high'));
    expect(onApply).toHaveBeenCalledWith([
      { id: 1, tag: 'groceries' },
      { id: 2, tag: 'groceries' },
      { id: 3, tag: 'transportation' },
    ]);
  });

  it('applies a whole group at once', () => {
    const onApply = renderWorkspace(ROWS);
    fireEvent.click(screen.getByRole('button', { name: 'Apply 2' }));
    // within a group, lowest-confidence first: SAFEWAY (0.9) before TRADER JOES (0.95)
    expect(onApply).toHaveBeenCalledWith([
      { id: 2, tag: 'groceries' },
      { id: 1, tag: 'groceries' },
    ]);
  });

  it('applies an edited category for a single row', () => {
    const onApply = renderWorkspace(ROWS);
    const slat = screen.getByText('SKETCHY LLC').closest('[data-testid="llm-slat"]') as HTMLElement;
    fireEvent.change(within(slat).getByLabelText('Category for SKETCHY LLC'), { target: { value: 'business' } });
    fireEvent.click(within(slat).getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith([{ id: 4, tag: 'business' }]);
  });

  it('shows an empty state when there is nothing to review', () => {
    renderWorkspace([]);
    expect(screen.getByText(/All caught up/i)).toBeInTheDocument();
    expect(screen.queryByTestId('llm-slat')).not.toBeInTheDocument();
  });
});
