import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@/test-utils';

vi.mock('@/app/actions/llm', () => ({
  suggestCategories: vi.fn(),
  applyCategory: vi.fn(),
  getLlmHealth: vi.fn(),
}));
import { suggestCategories, applyCategory, getLlmHealth } from '@/app/actions/llm';
import CategorySuggestions from './CategorySuggestions';

const fn = (m: unknown) => m as unknown as ReturnType<typeof vi.fn>;
const healthy = () => fn(getLlmHealth).mockResolvedValue({ ok: true });

describe('CategorySuggestions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders nothing when the local integration is not healthy', async () => {
    fn(getLlmHealth).mockResolvedValue({ ok: false, detail: 'off' });
    render(<CategorySuggestions />);
    await waitFor(() => expect(getLlmHealth).toHaveBeenCalled());
    expect(screen.queryByTestId('llm-suggest')).not.toBeInTheDocument();
  });

  it('opens a sheet with approval slats and applies a reviewed suggestion', async () => {
    healthy();
    fn(suggestCategories).mockResolvedValue([
      { id: 7, name: 'TRADER JOES', amount: -62, suggestion: { category: 'groceries', confidence: 0.9 } },
    ]);
    fn(applyCategory).mockResolvedValue(undefined);

    render(<CategorySuggestions />);
    fireEvent.click(await screen.findByTestId('llm-suggest'));

    const slat = await screen.findByTestId('llm-slat');
    expect(slat).toHaveTextContent('TRADER JOES');
    expect(slat).toHaveTextContent('90%');

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(applyCategory).toHaveBeenCalledWith(7, 'groceries'));
  });

  it('shows an empty state in the sheet when nothing needs categorizing', async () => {
    healthy();
    fn(suggestCategories).mockResolvedValue([]);
    render(<CategorySuggestions />);
    fireEvent.click(await screen.findByTestId('llm-suggest'));
    expect(await screen.findByText(/All caught up/)).toBeInTheDocument();
  });
});
