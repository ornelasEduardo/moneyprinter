'use server';

import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/action-middleware';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { llmConfig, LLM_DEFAULTS } from '@/lib/llm/config';
import { llmHealth, type LocalIntegrationHealth } from '@/lib/llm/health';

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
  ready: boolean;
  version?: string;
  detail?: string;
}

export async function getLlmSettings(): Promise<LlmSettingsView> {
  const userId = await requireAuth();
  const cfg = await llmConfig(userId);
  const h = await llmHealth(cfg);
  return {
    enabled: cfg.enabled,
    endpoint: cfg.endpoint,
    model: cfg.model,
    reachable: h.reachable,
    ready: h.ready,
    version: h.version,
    detail: h.detail,
  };
}

// Cheap probe the AI suggestion UI gates on — only surface it when the local
// integration is actually usable (enabled + Ollama up + model pulled).
export async function getLlmHealth(): Promise<LocalIntegrationHealth> {
  const userId = await requireAuth();
  return llmHealth(await llmConfig(userId));
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

export interface ApplyItem {
  id: number;
  tag: string;
}

// Applies reviewed categories in bulk — the workspace's "Apply group" / "Apply
// high-confidence" actions can send hundreds at once. Grouping by tag issues one
// UPDATE per distinct category (not one per row), all scoped by user_id, and
// revalidates a single time. Returns how many rows were tagged.
export async function applyCategories(items: ApplyItem[]): Promise<number> {
  const userId = await requireAuth();

  const byTag = new Map<string, number[]>();
  for (const it of items) {
    const clean = it.tag.trim();
    if (!clean || !Number.isInteger(it.id)) continue;
    const ids = byTag.get(clean) ?? [];
    ids.push(it.id);
    byTag.set(clean, ids);
  }

  let count = 0;
  for (const [tag, ids] of byTag) {
    const res = await prisma.transactions.updateMany({
      where: { id: { in: ids }, user_id: userId },
      data: { tags: tag },
    });
    count += res.count;
  }
  if (count > 0) revalidatePath('/');
  return count;
}
