import { describe, it, expect, vi, beforeEach } from 'vitest';
import { llmHealth } from './health';

const cfg = (over: Partial<{ enabled: boolean; endpoint: string; model: string }> = {}) => ({
  enabled: true,
  endpoint: 'http://localhost:11434',
  model: 'gpt-oss:20b',
  ...over,
});

function routeFetch(tags: { name: string }[]) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/api/version')) return new Response(JSON.stringify({ version: '0.33.3' }), { status: 200 });
    if (url.includes('/api/tags')) return new Response(JSON.stringify({ models: tags }), { status: 200 });
    throw new Error(`unexpected ${url}`);
  }));
}

describe('llmHealth', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('is not ok when the plugin is disabled', async () => {
    const h = await llmHealth(cfg({ enabled: false }));
    expect(h).toMatchObject({ ok: false, enabled: false });
  });

  it('is not ok when Ollama is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED'); }));
    const h = await llmHealth(cfg());
    expect(h).toMatchObject({ ok: false, reachable: false, ready: false });
    expect(h.detail).toMatch(/reachable/i);
  });

  it('is reachable but not ok when the configured model is not pulled', async () => {
    routeFetch([{ name: 'llama3:8b' }]);
    const h = await llmHealth(cfg());
    expect(h).toMatchObject({ ok: false, reachable: true, ready: false });
    expect(h.detail).toMatch(/ollama pull gpt-oss:20b/);
  });

  it('is ok when reachable and the model is present', async () => {
    routeFetch([{ name: 'gpt-oss:20b' }]);
    const h = await llmHealth(cfg());
    expect(h).toMatchObject({ ok: true, reachable: true, ready: true, version: '0.33.3' });
  });
});
