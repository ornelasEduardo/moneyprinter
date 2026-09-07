import type { Signal } from './signals';

export interface FinancialContext {
  get<T>(signal: Signal<T>): Promise<T>;
}

// Client store: synchronous serving of a serialized snapshot. Used directly
// by MortgageCalculator.tsx (a client component) — this file must stay free
// of Prisma. The server-side context (createServerContext) lives in
// server-context.ts, a server-only module, precisely so this one doesn't.
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
