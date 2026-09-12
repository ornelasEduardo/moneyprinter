import prisma from '@/lib/prisma';

// Local LLM plugin config. Inference runs on the user's own machine (their
// Ollama) — no financial data leaves the device — so this is a plain opt-in +
// endpoint/model, NOT the governed-egress path used for external hosts.
export interface LlmConfig {
  enabled: boolean;
  endpoint: string;
  model: string;
}

export const LLM_DEFAULTS = {
  endpoint: 'http://localhost:11434',
  model: 'gpt-oss:20b',
} as const;

export async function llmConfig(userId: number): Promise<LlmConfig> {
  const rows = await prisma.user_settings.findMany({
    where: { user_id: userId, key: { in: ['llm.enabled', 'llm.endpoint', 'llm.model'] } },
    select: { key: true, value: true },
  });
  const m = new Map(rows.map((r) => [r.key, r.value]));
  return {
    enabled: m.get('llm.enabled') === 'true',
    endpoint: m.get('llm.endpoint')?.trim() || LLM_DEFAULTS.endpoint,
    model: m.get('llm.model')?.trim() || LLM_DEFAULTS.model,
  };
}
