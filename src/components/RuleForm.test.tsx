import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import RuleForm from './RuleForm';
import { createRule, updateRule } from '@/app/actions/rules';

vi.mock('@/app/actions/rules', () => ({
  createRule: vi.fn(),
  updateRule: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const accounts = [{ id: 1, name: 'Checking' }];

describe('RuleForm — create', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders empty form fields', () => {
    render(<RuleForm accounts={accounts} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tags to add/i)).toBeInTheDocument();
  });

  it('submits createRule with serialized canonical Filter conditions', async () => {
    (createRule as any).mockResolvedValue(undefined);
    render(<RuleForm accounts={accounts} />);

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Coffee' } });
    fireEvent.change(screen.getByLabelText(/tags to add/i), { target: { value: 'coffee' } });

    fireEvent.click(screen.getByRole('button', { name: /create rule/i }));
    await waitFor(() => expect(createRule).toHaveBeenCalled());
    const fd = (createRule as any).mock.calls[0][0] as FormData;
    expect(fd.get('name')).toBe('Coffee');
    const conditions = JSON.parse(fd.get('conditions') as string);
    expect(conditions).toBeDefined();
    expect(typeof conditions).toBe('object');
  });
});

describe('RuleForm — edit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('prefills from initialRule and submits updateRule with the rule id', async () => {
    (updateRule as any).mockResolvedValue(undefined);
    const rule = {
      id: 5,
      name: 'Existing',
      enabled: true,
      priority: 3,
      conditions: { type: 'condition', field: 'name', operator: 'contains', value: 'Foo' } as const,
      actions: { addTags: ['x'] },
    };
    render(<RuleForm accounts={accounts} initial={rule} />);
    expect(
      (screen.getByLabelText(/name/i, { selector: 'input' }) as HTMLInputElement).value
    ).toBe('Existing');

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(updateRule).toHaveBeenCalled());
    expect((updateRule as any).mock.calls[0][0]).toBe(5);
  });
});
