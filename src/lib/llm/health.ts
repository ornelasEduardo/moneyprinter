import type { LlmConfig } from './config';
import { llmReachable } from './client';

// Reusable "is this local integration usable right now?" result. Gate a local
// plugin's UI on `ok`. The template any future local integration follows: a
// cheap health probe that says whether MoneyPrinter should surface its UI.
export interface LocalIntegrationHealth {
  ok: boolean;        // enabled + reachable + ready → safe to show the UI
  enabled: boolean;
  reachable: boolean;
  ready: boolean;     // fully usable (for the LLM: the configured model is pulled)
  version?: string;
  detail?: string;    // human-readable status / next step when not ok
}

async function installedModels(endpoint: string): Promise<string[]> {
  try {
    const res = await fetch(`${endpoint.replace(/\/+$/, '')}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const j = (await res.json()) as { models?: { name?: string }[] };
    return (j.models ?? []).map((m) => m.name ?? '').filter(Boolean);
  } catch {
    return [];
  }
}

function modelMatches(installed: string[], model: string): boolean {
  const base = model.split(':')[0];
  return installed.some((m) => m === model || m === `${model}:latest` || m.split(':')[0] === base);
}

export async function llmHealth(config: LlmConfig): Promise<LocalIntegrationHealth> {
  if (!config.enabled) {
    return { ok: false, enabled: false, reachable: false, ready: false, detail: 'The local AI plugin is off.' };
  }
  const reach = await llmReachable(config.endpoint);
  if (!reach.ok) {
    return { ok: false, enabled: true, reachable: false, ready: false, detail: `Ollama isn’t reachable at ${config.endpoint}.` };
  }
  const ready = modelMatches(await installedModels(config.endpoint), config.model);
  return {
    ok: ready,
    enabled: true,
    reachable: true,
    ready,
    version: reach.version,
    detail: ready ? undefined : `Model “${config.model}” isn’t pulled — run: ollama pull ${config.model}`,
  };
}
