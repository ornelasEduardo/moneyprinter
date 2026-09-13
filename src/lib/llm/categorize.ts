import { z } from 'zod';
import type { LlmConfig } from './config';
import { llmChatJson, type LlmMessage } from './client';

export interface CategorizeTxn {
  name: string;
  amount: number;
  type?: string;
}

export interface CategorySuggestion {
  category: string;
  confidence: number;
}

// A sensible baseline when the user has no tags yet, so the very first
// categorization still has a vocabulary to choose from.
export const DEFAULT_CATEGORIES = [
  'Groceries', 'Dining', 'Transportation', 'Entertainment',
  'Utilities', 'Subscriptions', 'Housing', 'Health', 'Income', 'Other',
];

export function buildCategorizeMessages(txn: CategorizeTxn, vocabulary: string[]): LlmMessage[] {
  const cats = (vocabulary.length ? vocabulary : DEFAULT_CATEGORIES).join(', ');
  return [
    {
      role: 'system',
      content:
        `You categorize personal-finance transactions. Choose exactly ONE category from this list: ${cats}. ` +
        `Base it on the merchant/description and amount sign. Give a confidence from 0 to 1.`,
    },
    {
      role: 'user',
      content: `Transaction: "${txn.name}", amount ${txn.amount}${txn.type ? `, type ${txn.type}` : ''}.`,
    },
  ];
}

// Constrain the model to the user's own taxonomy via an enum, and validate the
// same shape with zod.
export function categorySchema(vocabulary: string[]) {
  const cats = vocabulary.length ? vocabulary : DEFAULT_CATEGORIES;
  const jsonSchema = {
    type: 'object',
    properties: {
      category: { type: 'string', enum: cats },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
    },
    required: ['category', 'confidence'],
    additionalProperties: false,
  };
  const zodSchema = z.object({
    category: z.string().min(1),
    confidence: z.number().min(0).max(1),
  });
  return { jsonSchema, zodSchema };
}

export async function suggestCategory(
  config: LlmConfig,
  txn: CategorizeTxn,
  vocabulary: string[],
): Promise<CategorySuggestion> {
  const { jsonSchema, zodSchema } = categorySchema(vocabulary);
  return llmChatJson(config, buildCategorizeMessages(txn, vocabulary), jsonSchema, zodSchema);
}

// ── Batch classification ──────────────────────────────────────────────────
// At volume we classify many transactions per call instead of one-per-round-trip:
// gpt-oss's 128K context easily holds a batch, and one structured array response
// turns ~1000 sequential inferences into a few dozen. Each result echoes its
// transaction `id` so we can realign regardless of the order the model returns.

export interface BatchTxn extends CategorizeTxn {
  id: number;
}

export interface BatchResult {
  id: number;
  category: string;
  confidence: number;
}

export function buildBatchCategorizeMessages(txns: BatchTxn[], vocabulary: string[]): LlmMessage[] {
  const cats = (vocabulary.length ? vocabulary : DEFAULT_CATEGORIES).join(', ');
  const lines = txns
    .map((t) => `[id ${t.id}] "${t.name}", amount ${t.amount}${t.type ? `, type ${t.type}` : ''}`)
    .join('\n');
  return [
    {
      role: 'system',
      content:
        `You categorize personal-finance transactions. For EACH transaction choose exactly ONE ` +
        `category from this list: ${cats}. Base it on the merchant/description and amount sign, and ` +
        `give a confidence from 0 to 1. Return one result per transaction, echoing its id exactly. ` +
        `Do not add, drop, or merge transactions.`,
    },
    { role: 'user', content: `Transactions:\n${lines}\n\nReturn a result for every id above.` },
  ];
}

export function batchCategorySchema(vocabulary: string[]) {
  const cats = vocabulary.length ? vocabulary : DEFAULT_CATEGORIES;
  const jsonSchema = {
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            category: { type: 'string', enum: cats },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
          required: ['id', 'category', 'confidence'],
          additionalProperties: false,
        },
      },
    },
    required: ['results'],
    additionalProperties: false,
  };
  const zodSchema = z.object({
    results: z.array(
      z.object({
        id: z.number().int(),
        category: z.string().min(1),
        confidence: z.number().min(0).max(1),
      }),
    ),
  });
  return { jsonSchema, zodSchema };
}

// A whole batch takes longer than a single row — give it proportional headroom.
export async function suggestCategoryBatch(
  config: LlmConfig,
  txns: BatchTxn[],
  vocabulary: string[],
  timeoutMs = 120_000,
): Promise<BatchResult[]> {
  const { jsonSchema, zodSchema } = batchCategorySchema(vocabulary);
  const { results } = await llmChatJson(
    config,
    buildBatchCategorizeMessages(txns, vocabulary),
    jsonSchema,
    zodSchema,
    timeoutMs,
  );
  return results;
}
