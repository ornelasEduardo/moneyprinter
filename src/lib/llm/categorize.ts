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
