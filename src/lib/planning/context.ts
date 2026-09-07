import type { Signal } from './signals';

export interface FinancialContext {
  get<T>(signal: Signal<T>): Promise<T>;
}

interface RecordingContext extends FinancialContext {
  __resolved: Map<string, unknown>;
}

// Server store: lazy + memoized, records resolved values for snapshotting.
export function createServerContext(userId: number): FinancialContext {
  const resolved = new Map<string, unknown>();
  const inflight = new Map<string, Promise<unknown>>();
  const ctx: RecordingContext = {
    __resolved: resolved,
    async get<T>(signal: Signal<T>): Promise<T> {
      if (resolved.has(signal.id)) return resolved.get(signal.id) as T;
      let p = inflight.get(signal.id) as Promise<T> | undefined;
      if (!p) {
        p = signal.load(userId).then((v) => {
          resolved.set(signal.id, v);
          inflight.delete(signal.id);
          return v;
        });
        inflight.set(signal.id, p);
      }
      return p;
    },
  };
  return ctx;
}

export function snapshotOf(ctx: FinancialContext): Record<string, unknown> {
  return Object.fromEntries((ctx as RecordingContext).__resolved);
}

// Client store: synchronous serving of a serialized snapshot.
export function createSnapshotContext(snapshot: Record<string, unknown>): FinancialContext {
  return {
    async get<T>(signal: Signal<T>): Promise<T> {
      if (!(signal.id in snapshot)) {
        throw new Error(`Signal "${signal.id}" missing from snapshot`);
      }
      return snapshot[signal.id] as T;
    },
  };
}
