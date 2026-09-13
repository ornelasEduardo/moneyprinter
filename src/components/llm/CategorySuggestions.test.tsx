import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@/test-utils';
import type { StreamSuggestion } from '@/lib/llm/useCategorizationStream';

// Render all virtual items — happy-dom's 0-height container renders none otherwise.
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 68,
    getVirtualItems: () => Array.from({ length: count }, (_, index) => ({ key: index, index, start: index * 68 })),
    measureElement: () => {},
  }),
}));

vi.mock('@/app/actions/llm', () => ({
  getLlmHealth: vi.fn(),
  applyCategories: vi.fn(),
}));

// Control the streaming hook so the orchestrator test stays deterministic — the
// real streaming path is exercised by scripts/verify-llm-batch.mjs + the route.
const start = vi.fn();
const cancel = vi.fn();
const reset = vi.fn();
const removeRows = vi.fn();
let hookRows: StreamSuggestion[] = [];
vi.mock('@/lib/llm/useCategorizationStream', () => ({
  useCategorizationStream: () => ({
    rows: hookRows,
    progress: { done: hookRows.length, total: hookRows.length },
    streaming: false,
    error: null,
    start,
    cancel,
    reset,
    removeRows,
  }),
}));

import { getLlmHealth, applyCategories } from '@/app/actions/llm';
import CategorySuggestions from './CategorySuggestions';

const fn = (m: unknown) => m as unknown as ReturnType<typeof vi.fn>;
const healthy = () => fn(getLlmHealth).mockResolvedValue({ ok: true });

describe('CategorySuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookRows = [];
  });

  it('renders nothing when the local integration is not healthy', async () => {
    fn(getLlmHealth).mockResolvedValue({ ok: false, detail: 'off' });
    render(<CategorySuggestions />);
    await waitFor(() => expect(getLlmHealth).toHaveBeenCalled());
    expect(screen.queryByTestId('llm-suggest')).not.toBeInTheDocument();
  });

  it('shows the entry CTA when healthy and starts the stream on Review', async () => {
    healthy();
    render(<CategorySuggestions />);
    const cta = await screen.findByTestId('llm-suggest');
    fireEvent.click(cta);
    expect(start).toHaveBeenCalled();
    // workspace replaces the CTA
    expect(await screen.findByTestId('llm-workspace')).toBeInTheDocument();
  });

  it('applies a reviewed suggestion via the bulk action and clears it', async () => {
    healthy();
    hookRows = [{ id: 7, name: 'TRADER JOES', amount: -62, category: 'groceries', confidence: 0.95 }];
    fn(applyCategories).mockResolvedValue(1);

    render(<CategorySuggestions />);
    fireEvent.click(await screen.findByTestId('llm-suggest'));

    const slat = await screen.findByTestId('llm-slat');
    expect(slat).toHaveTextContent('TRADER JOES');
    fireEvent.click(within(slat).getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(applyCategories).toHaveBeenCalledWith([{ id: 7, tag: 'groceries' }]));
    expect(removeRows).toHaveBeenCalledWith([7]);
  });
});
