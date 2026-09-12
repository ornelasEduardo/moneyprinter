import { z } from 'zod';
import type { LlmConfig } from './config';

export type LlmErrorCode = 'disabled' | 'unreachable' | 'bad_response' | 'invalid_output';

export class LlmError extends Error {
  constructor(public code: LlmErrorCode, message: string) {
    super(message);
    this.name = 'LlmError';
  }
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const trimSlash = (s: string) => s.replace(/\/+$/, '');

// Is the user's Ollama up? Cheap GET, short timeout — surfaced in Settings.
export async function llmReachable(endpoint: string): Promise<{ ok: boolean; version?: string }> {
  try {
    const res = await fetch(`${trimSlash(endpoint)}/api/version`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { ok: false };
    const j = (await res.json()) as { version?: string };
    return { ok: true, version: j.version };
  } catch {
    return { ok: false };
  }
}

// Structured chat: `jsonSchema` constrains the model's output (Ollama structured
// outputs); `validate` is the zod schema we trust the result against. Every
// failure is a typed LlmError so callers can message the user precisely.
export async function llmChatJson<T>(
  config: LlmConfig,
  messages: LlmMessage[],
  jsonSchema: Record<string, unknown>,
  validate: z.ZodType<T>,
  timeoutMs = 60_000,
): Promise<T> {
  if (!config.enabled) throw new LlmError('disabled', 'The local LLM plugin is turned off.');

  let res: Response;
  try {
    res = await fetch(`${trimSlash(config.endpoint)}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: config.model, stream: false, format: jsonSchema, messages }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new LlmError('unreachable', `Couldn't reach Ollama at ${config.endpoint}. Is it running?`);
  }

  if (!res.ok) throw new LlmError('bad_response', `Ollama returned ${res.status}.`);

  const data = (await res.json()) as { message?: { content?: string } };
  let raw: unknown;
  try {
    raw = JSON.parse(data.message?.content ?? '');
  } catch {
    throw new LlmError('invalid_output', 'The model did not return valid JSON.');
  }

  const parsed = validate.safeParse(raw);
  if (!parsed.success) throw new LlmError('invalid_output', 'The model output did not match the expected shape.');
  return parsed.data;
}
