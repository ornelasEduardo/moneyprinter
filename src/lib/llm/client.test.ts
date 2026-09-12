import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { llmChatJson, llmReachable } from './client';

const cfg = { enabled: true, endpoint: 'http://localhost:11434', model: 'gpt-oss:20b' };
const schema = z.object({ category: z.string(), confidence: z.number() });
const jsonSchema = { type: 'object' as const };
const okBody = (content: string) =>
  new Response(JSON.stringify({ message: { content } }), { status: 200 });

describe('llmChatJson', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('throws "disabled" when the plugin is off (no network call)', async () => {
    const fetchSpy = vi.stubGlobal('fetch', vi.fn());
    await expect(llmChatJson({ ...cfg, enabled: false }, [], jsonSchema, schema))
      .rejects.toMatchObject({ code: 'disabled' });
    expect((globalThis.fetch as any)).not.toHaveBeenCalled();
    void fetchSpy;
  });

  it('parses and validates a well-formed response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okBody('{"category":"Groceries","confidence":0.9}')));
    const out = await llmChatJson(cfg, [{ role: 'user', content: 'x' }], jsonSchema, schema);
    expect(out).toEqual({ category: 'Groceries', confidence: 0.9 });
  });

  it('throws "invalid_output" on non-JSON content', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okBody('not json')));
    await expect(llmChatJson(cfg, [], jsonSchema, schema)).rejects.toMatchObject({ code: 'invalid_output' });
  });

  it('throws "invalid_output" when the shape fails validation', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okBody('{"category":"X"}')));
    await expect(llmChatJson(cfg, [], jsonSchema, schema)).rejects.toMatchObject({ code: 'invalid_output' });
  });

  it('throws "unreachable" when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED'); }));
    await expect(llmChatJson(cfg, [], jsonSchema, schema)).rejects.toMatchObject({ code: 'unreachable' });
  });

  it('throws "bad_response" on a non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('err', { status: 500 })));
    await expect(llmChatJson(cfg, [], jsonSchema, schema)).rejects.toMatchObject({ code: 'bad_response' });
  });
});

describe('llmReachable', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns ok + version on 200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ version: '0.33.3' }), { status: 200 })));
    expect(await llmReachable('http://localhost:11434/')).toEqual({ ok: true, version: '0.33.3' });
  });

  it('returns { ok: false } when unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('x'); }));
    expect(await llmReachable('http://localhost:11434')).toEqual({ ok: false });
  });
});
