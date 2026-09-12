'use server';

import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/action-middleware';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { llmConfig, LLM_DEFAULTS } from '@/lib/llm/config';
import { llmReachable } from '@/lib/llm/client';
import { suggestCategory, type CategorySuggestion } from '@/lib/llm/categorize';
import { splitTags } from '@/lib/tags';

// How many untagged transactions one "Suggest categories" run processes. Bounds
// the wait (one local inference each, ~1–2s) — the user can run it again.
const MAX_SUGGEST = 10;

async function writeSetting(userId: number, key: string, value: string): Promise<void> {
  await prisma.user_settings.upsert({
    where: { user_id_key: { user_id: userId, key } },
    update: { value },
    create: { user_id: userId, key, value },
  });
}

export interface LlmSettingsView {
  enabled: boolean;
  endpoint: string;
  model: string;
  reachable: boolean;
  version?: string;
}

export async function getLlmSettings(): Promise<LlmSettingsView> {
  const userId = await requireAuth();
  const cfg = await llmConfig(userId);
  const r = await llmReachable(cfg.endpoint);
  return { enabled: cfg.enabled, endpoint: cfg.endpoint, model: cfg.model, reachable: r.ok, version: r.version };
}

const settingsSchema = z.object({
  enabled: z.boolean(),
  endpoint: z.union([z.url(), z.literal('')]),
  model: z.string().trim().max(100),
});

export async function saveLlmSettings(input: unknown): Promise<void> {
  const userId = await requireAuth();
  const cfg = settingsSchema.parse(input);
  await writeSetting(userId, 'llm.enabled', String(cfg.enabled));
  await writeSetting(userId, 'llm.endpoint', cfg.endpoint || LLM_DEFAULTS.endpoint);
  await writeSetting(userId, 'llm.model', cfg.model || LLM_DEFAULTS.model);
  revalidatePath('/');
}

async function userVocabulary(userId: number): Promise<string[]> {
  const rows = await prisma.transactions.findMany({
    where: { user_id: userId, deleted_at: null, tags: { not: null } },
    select: { tags: true },
    distinct: ['tags'],
  });
  const set = new Set<string>();
  for (const r of rows) for (const t of splitTags(r.tags)) set.add(t);
  return Array.from(set).sort();
}

export interface CategorySuggestionRow {
  id: number;
  name: string;
  amount: number;
  suggestion: CategorySuggestion;
}

// Suggests categories for the most recent untagged transactions. DOES NOT WRITE
// — the user approves each via applyCategory.
export async function suggestCategories(): Promise<CategorySuggestionRow[]> {
  const userId = await requireAuth();
  const cfg = await llmConfig(userId);
  if (!cfg.enabled) throw new Error('The local LLM plugin is turned off — enable it in Settings.');

  const vocab = await userVocabulary(userId);
  const txns = await prisma.transactions.findMany({
    where: { user_id: userId, deleted_at: null, OR: [{ tags: null }, { tags: '' }] },
    select: { id: true, name: true, amount: true, type: true },
    orderBy: { date: 'desc' },
    take: MAX_SUGGEST,
  });

  const results: CategorySuggestionRow[] = [];
  for (const t of txns) {
    try {
      const suggestion = await suggestCategory(
        cfg,
        { name: t.name, amount: Number(t.amount), type: t.type ?? undefined },
        vocab,
      );
      results.push({ id: t.id, name: t.name, amount: Number(t.amount), suggestion });
    } catch {
      // Skip a transaction the model couldn't categorize; keep the batch going.
    }
  }
  return results;
}

export async function applyCategory(txnId: number, tag: string): Promise<void> {
  const userId = await requireAuth();
  const clean = tag.trim();
  if (!clean) throw new Error('Category is required');
  // updateMany scoped by user_id — never lets one user tag another's row.
  await prisma.transactions.updateMany({
    where: { id: txnId, user_id: userId },
    data: { tags: clean },
  });
  revalidatePath('/');
}
