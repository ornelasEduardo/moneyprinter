import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import RuleList from './RuleList';
import { deleteRule, applyRuleToHistory, previewRuleAgainstHistory } from '@/app/actions/rules';

vi.mock('@/app/actions/rules', () => ({
  deleteRule: vi.fn(),
  applyRuleToHistory: vi.fn(),
  previewRuleAgainstHistory: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const rules = [
  { id: 1, name: 'Coffee Shops', enabled: true, priority: 5, matchCount: 12 },
  { id: 2, name: 'Subscriptions', enabled: false, priority: 0, matchCount: 0 },
];

describe('RuleList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders rules with name, priority, match count', () => {
    render(<RuleList rules={rules} />);
    expect(screen.getByText('Coffee Shops')).toBeInTheDocument();
    expect(screen.getByText('Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('12 transactions')).toBeInTheDocument();
  });

  it('clicking apply-to-history opens a preview confirmation', async () => {
    (previewRuleAgainstHistory as any).mockResolvedValue({ matches: [{ id: 1 }, { id: 2 }] });
    render(<RuleList rules={rules} />);
    fireEvent.click(screen.getAllByRole('button', { name: /apply to history/i })[0]);
    await waitFor(() => expect(screen.getByText(/2 matching/i)).toBeInTheDocument());
  });

  it('confirming delete with default option calls deleteRule with stripApplications=false', async () => {
    (deleteRule as any).mockResolvedValue(undefined);
    render(<RuleList rules={rules} />);
    fireEvent.click(screen.getAllByRole('button', { name: /delete rule/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await waitFor(() =>
      expect(deleteRule).toHaveBeenCalledWith(1, { stripApplications: false })
    );
  });

  it('confirming delete with strip option calls deleteRule with stripApplications=true', async () => {
    (deleteRule as any).mockResolvedValue(undefined);
    render(<RuleList rules={rules} />);
    fireEvent.click(screen.getAllByRole('button', { name: /delete rule/i })[0]);
    fireEvent.click(screen.getByLabelText(/also strip/i));
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await waitFor(() =>
      expect(deleteRule).toHaveBeenCalledWith(1, { stripApplications: true })
    );
  });
});
