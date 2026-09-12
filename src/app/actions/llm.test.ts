import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/action-middleware', () => ({ requireAuth: vi.fn(async () => 2) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  default: {
    user_settings: { findMany: vi.fn(), upsert: vi.fn() },
    transactions: { findMany: vi.fn(), updateMany: vi.fn() },
  },
}));
vi.mock('@/lib/llm/client', () => ({ llmReachable: vi.fn(async () => ({ ok: true, version: '0.33.3' })) }));
vi.mock('@/lib/llm/categorize', async (orig) => ({
  ...(await orig<typeof import('@/lib/llm/categorize')>()),
  suggestCategory: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { suggestCategory } from '@/lib/llm/categorize';
import { suggestCategories, applyCategory, saveLlmSettings, getLlmSettings } from './llm';

const fn = (m: unknown) => m as unknown as ReturnType<typeof vi.fn>;
const enable = (on: boolean) =>
  fn(prisma.user_settings.findMany).mockResolvedValue(on ? [{ key: 'llm.enabled', value: 'true' }] : []);

describe('llm actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fn(prisma.user_settings.upsert).mockResolvedValue({});
  });

  it('suggestCategories throws when the plugin is off', async () => {
    enable(false);
    await expect(suggestCategories()).rejects.toThrow(/turned off/i);
  });

  it('suggestCategories returns suggestions and writes nothing', async () => {
    enable(true);
    fn(prisma.transactions.findMany)
      .mockResolvedValueOnce([]) // vocabulary (distinct tags)
      .mockResolvedValueOnce([{ id: 7, name: 'SHELL OIL', amount: -40, type: 'expense' }]); // untagged
    fn(suggestCategory).mockResolvedValue({ category: 'Transportation', confidence: 0.9 });

    const rows = await suggestCategories();
    expect(rows).toEqual([
      { id: 7, name: 'SHELL OIL', amount: -40, suggestion: { category: 'Transportation', confidence: 0.9 } },
    ]);
    expect(prisma.transactions.updateMany).not.toHaveBeenCalled();
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

  it('saveLlmSettings persists enabled + endpoint + model', async () => {
    await saveLlmSettings({ enabled: true, endpoint: 'http://localhost:11434', model: 'gpt-oss:20b' });
    const keys = fn(prisma.user_settings.upsert).mock.calls.map((c) => (c[0] as { where: { user_id_key: { key: string } } }).where.user_id_key.key);
    expect(keys).toEqual(expect.arrayContaining(['llm.enabled', 'llm.endpoint', 'llm.model']));
  });

  it('getLlmSettings reports reachability', async () => {
    enable(true);
    const view = await getLlmSettings();
    expect(view).toMatchObject({ enabled: true, reachable: true, version: '0.33.3' });
  });
});
