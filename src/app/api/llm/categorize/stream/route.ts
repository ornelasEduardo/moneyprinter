import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { llmConfig } from '@/lib/llm/config';
import { llmHealth } from '@/lib/llm/health';
import { suggestCategoryBatch, suggestCategory, type BatchTxn } from '@/lib/llm/categorize';
import { userVocabulary, untaggedTransactions } from '@/lib/llm/queries';

// Local inference is slow and streaming keeps the response body open for minutes —
// force the Node runtime (not edge) and opt out of any caching.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Rows per model call. Per-row time dominates on a local 20B model, so this trades
// round-trip overhead against how soon the first results reach the UI — small enough
// to stream steadily, large enough to keep prompt re-processing amortized.
const BATCH = 10;

// One NDJSON line per event. The client reads these incrementally:
//   {type:'meta', total}                         — how many rows will be classified
//   {type:'suggestion', id, name, amount, category, confidence}
//   {type:'progress', done, total}               — after each batch
//   {type:'error', message} / {type:'done'}
export async function POST(req: NextRequest): Promise<Response> {
  let userId: number;
  try {
    userId = await requireAuth();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const cfg = await llmConfig(userId);
  const health = await llmHealth(cfg);
  if (!health.ok) {
    return Response.json(
      { error: health.detail ?? 'Local AI is not available.' },
      { status: 409 },
    );
  }

  const vocab = await userVocabulary(userId);
  const txns = await untaggedTransactions(userId);
  const byId = new Map(txns.map((t) => [t.id, t]));

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Guard every enqueue: once the client disconnects the controller is closed
      // and enqueue throws — we swallow it and let the loop's abort check stop us.
      let closed = false;
      const send = (obj: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
        } catch {
          closed = true;
        }
      };

      send({ type: 'meta', total: txns.length });

      let done = 0;
      for (let i = 0; i < txns.length; i += BATCH) {
        if (req.signal.aborted || closed) break;
        const chunk = txns.slice(i, i + BATCH);
        const input: BatchTxn[] = chunk.map((t) => ({
          id: t.id,
          name: t.name,
          amount: Number(t.amount),
          type: t.type ?? undefined,
        }));

        try {
          const results = await suggestCategoryBatch(cfg, input, vocab);
          for (const r of results) {
            const t = byId.get(r.id);
            if (!t) continue; // ignore any id the model invented
            send({
              type: 'suggestion',
              id: r.id,
              name: t.name,
              amount: Number(t.amount),
              category: r.category,
              confidence: r.confidence,
            });
          }
        } catch {
          // One bad batch shouldn't cost 10 rows — fall back to per-row so the
          // stream keeps flowing and only the truly un-parseable rows drop out.
          await emitPerRow(input, vocab, cfg, send, req);
        }

        done += chunk.length;
        send({ type: 'progress', done, total: txns.length });
      }

      send({ type: 'done' });
      if (!closed) controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
      'x-accel-buffering': 'no',
    },
  });
}

async function emitPerRow(
  input: BatchTxn[],
  vocab: string[],
  cfg: Awaited<ReturnType<typeof llmConfig>>,
  send: (obj: unknown) => void,
  req: NextRequest,
): Promise<void> {
  for (const t of input) {
    if (req.signal.aborted) return;
    try {
      const s = await suggestCategory(cfg, { name: t.name, amount: t.amount, type: t.type }, vocab);
      send({ type: 'suggestion', id: t.id, name: t.name, amount: t.amount, category: s.category, confidence: s.confidence });
    } catch {
      // skip a row the model can't categorize
    }
  }
}
