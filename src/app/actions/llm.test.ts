import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/action-middleware', () => ({ requireAuth: vi.fn(async () => 2) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  default: {
    user_settings: { findMany: vi.fn(), upsert: vi.fn() },
    transactions: { findMany: vi.fn(), updateMany: vi.fn() },
  },
}));
vi.mock('@/lib/llm/health', () => ({
  llmHealth: vi.fn(async () => ({ ok: true, enabled: true, reachable: true, ready: true, version: '0.33.3' })),
}));

import prisma from '@/lib/prisma';
import { applyCategory, applyCategories, saveLlmSettings, getLlmSettings, getLlmHealth } from './llm';

const fn = (m: unknown) => m as unknown as ReturnType<typeof vi.fn>;
const enable = (on: boolean) =>
  fn(prisma.user_settings.findMany).mockResolvedValue(on ? [{ key: 'llm.enabled', value: 'true' }] : []);

describe('llm actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fn(prisma.user_settings.upsert).mockResolvedValue({});
  });

  it('applyCategory writes the trimmed tag scoped by user_id', async () => {
    fn(prisma.transactions.updateMany).mockResolvedValue({ count: 1 });
    await applyCategory(7, '  Groceries  ');
    expect(prisma.transactions.updateMany).toHaveBeenCalledWith({
      where: { id: 7, user_id: 2 },
      data: { tags: 'Groceries' },
    });
  });

  it('applyCategory rejects an empty tag', async () => {
    await expect(applyCategory(7, '   ')).rejects.toThrow(/required/i);
    expect(prisma.transactions.updateMany).not.toHaveBeenCalled();
  });

  it('applyCategories groups by tag: one update per distinct category, empties skipped', async () => {
    fn(prisma.transactions.updateMany).mockResolvedValue({ count: 2 });
    const n = await applyCategories([
      { id: 7, tag: 'Groceries' },
      { id: 8, tag: '  Groceries  ' },
      { id: 9, tag: 'Transportation' },
      { id: 10, tag: '   ' }, // empty → skipped
    ]);
    expect(prisma.transactions.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.transactions.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [7, 8] }, user_id: 2 },
      data: { tags: 'Groceries' },
    });
    expect(prisma.transactions.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [9] }, user_id: 2 },
      data: { tags: 'Transportation' },
    });
    expect(n).toBe(4); // 2 mocked rows × 2 update calls
  });

  it('applyCategories writes nothing when every item is empty', async () => {
    const n = await applyCategories([{ id: 7, tag: '  ' }]);
    expect(prisma.transactions.updateMany).not.toHaveBeenCalled();
    expect(n).toBe(0);
  });

  it('saveLlmSettings persists enabled + endpoint + model', async () => {
    await saveLlmSettings({ enabled: true, endpoint: 'http://localhost:11434', model: 'gpt-oss:20b' });
    const keys = fn(prisma.user_settings.upsert).mock.calls.map((c) => (c[0] as { where: { user_id_key: { key: string } } }).where.user_id_key.key);
    expect(keys).toEqual(expect.arrayContaining(['llm.enabled', 'llm.endpoint', 'llm.model']));
  });

  it('getLlmSettings reports reachability + readiness from the health check', async () => {
    enable(true);
    const view = await getLlmSettings();
    expect(view).toMatchObject({ enabled: true, reachable: true, ready: true, version: '0.33.3' });
  });

  it('getLlmHealth returns the health result', async () => {
    enable(true);
    expect(await getLlmHealth()).toMatchObject({ ok: true, ready: true });
  });
});
