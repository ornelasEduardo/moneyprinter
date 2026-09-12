// Server-only FinancialContext. Split out of context.ts so that file (which
// MortgageCalculator.tsx, a client component, imports for createSnapshotContext)
// never has to pull in the Prisma-backed signal loader registry.
import type { Signal } from './signals';
import type { FinancialContext } from './context';
import { SIGNAL_LOADERS, type SignalLoader } from './signal-loaders';

interface RecordingContext extends FinancialContext {
  __resolved: Map<string, unknown>;
}

// Server store: lazy + memoized, records resolved values for snapshotting.
// Loaders default to the real Prisma-backed registry (signal-loaders.ts);
// callers (tests) may inject an alternate map.
export function createServerContext(
  userId: number,
  loaders: Record<string, SignalLoader> = SIGNAL_LOADERS,
): FinancialContext {
  const resolved = new Map<string, unknown>();
  const inflight = new Map<string, Promise<unknown>>();
  const ctx: RecordingContext = {
    __resolved: resolved,
    async get<T>(signal: Signal<T>): Promise<T> {
      if (resolved.has(signal.id)) return resolved.get(signal.id) as T;
      let p = inflight.get(signal.id) as Promise<T> | undefined;
      if (!p) {
        const loader = loaders[signal.id];
        if (!loader) throw new Error(`No loader registered for signal "${signal.id}"`);
        p = (loader(userId) as Promise<T>).then((v) => {
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
