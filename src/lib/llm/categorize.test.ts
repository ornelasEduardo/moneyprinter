import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./client', () => ({ llmChatJson: vi.fn() }));
import { llmChatJson } from './client';
import { buildCategorizeMessages, categorySchema, suggestCategory, DEFAULT_CATEGORIES } from './categorize';

const cfg = { enabled: true, endpoint: 'x', model: 'm' };

describe('categorize', () => {
  beforeEach(() => vi.clearAllMocks());

  it('builds messages listing the vocabulary and the transaction', () => {
    const msgs = buildCategorizeMessages({ name: 'SHELL OIL', amount: -40 }, ['Fuel', 'Food']);
    expect(msgs[0].content).toContain('Fuel');
    expect(msgs[0].content).toContain('Food');
    expect(msgs[1].content).toContain('SHELL OIL');
    expect(msgs[1].content).toContain('-40');
  });

  it('falls back to default categories when the vocabulary is empty', () => {
    const { jsonSchema } = categorySchema([]);
    expect((jsonSchema.properties.category as { enum: string[] }).enum).toEqual(DEFAULT_CATEGORIES);
  });

  it('constrains the schema enum to the user vocabulary', () => {
    const { jsonSchema } = categorySchema(['A', 'B']);
    expect((jsonSchema.properties.category as { enum: string[] }).enum).toEqual(['A', 'B']);
  });

  it('suggestCategory delegates to llmChatJson with the built prompt + schema', async () => {
    (llmChatJson as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ category: 'Fuel', confidence: 0.8 });
    const out = await suggestCategory(cfg, { name: 'SHELL', amount: -40 }, ['Fuel', 'Food']);
    expect(out).toEqual({ category: 'Fuel', confidence: 0.8 });
    const [, messages, jsonSchema] = (llmChatJson as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(messages[0].content).toContain('Fuel');
    expect((jsonSchema.properties.category as { enum: string[] }).enum).toEqual(['Fuel', 'Food']);
  });
});
