'use client';

import { useCallback, useRef, useState } from 'react';

export interface StreamSuggestion {
  id: number;
  name: string;
  amount: number;
  category: string;
  confidence: number;
}

export interface StreamProgress {
  done: number;
  total: number;
}

interface StreamEvent {
  type: 'meta' | 'suggestion' | 'progress' | 'error' | 'done';
  total?: number;
  done?: number;
  message?: string;
  id?: number;
  name?: string;
  amount?: number;
  category?: string;
  confidence?: number;
}

// Streams category suggestions from the local model in real time: POSTs to the
// route, reads its NDJSON body line-by-line, and surfaces each suggestion the
// moment it arrives so the workspace fills in while the rest still compute.
export function useCategorizationStream() {
  const [rows, setRows] = useState<StreamSuggestion[]>([]);
  const [progress, setProgress] = useState<StreamProgress>({ done: 0, total: 0 });
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setRows([]);
    setProgress({ done: 0, total: 0 });
    setError(null);
    setStreaming(false);
  }, []);

  const start = useCallback(async () => {
    abortRef.current?.abort();
    setRows([]);
    setProgress({ done: 0, total: 0 });
    setError(null);
    setStreaming(true);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch('/api/llm/categorize/stream', { method: 'POST', signal: ac.signal });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? `Request failed (${res.status}).`);
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          handleEvent(JSON.parse(line) as StreamEvent);
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError(e instanceof Error ? e.message : 'Streaming failed.');
      }
    } finally {
      setStreaming(false);
    }

    function handleEvent(evt: StreamEvent) {
      switch (evt.type) {
        case 'meta':
          setProgress({ done: 0, total: evt.total ?? 0 });
          break;
        case 'suggestion':
          setRows((prev) => [
            ...prev,
            {
              id: evt.id!,
              name: evt.name ?? '',
              amount: evt.amount ?? 0,
              category: evt.category ?? '',
              confidence: evt.confidence ?? 0,
            },
          ]);
          break;
        case 'progress':
          setProgress({ done: evt.done ?? 0, total: evt.total ?? 0 });
          break;
        case 'error':
          setError(evt.message ?? 'Streaming failed.');
          break;
      }
    }
  }, []);

  // Drop rows the user has acted on (applied/dismissed) without a re-fetch.
  const removeRows = useCallback((ids: number[]) => {
    const drop = new Set(ids);
    setRows((prev) => prev.filter((r) => !drop.has(r.id)));
  }, []);

  return { rows, progress, streaming, error, start, cancel, reset, removeRows };
}
