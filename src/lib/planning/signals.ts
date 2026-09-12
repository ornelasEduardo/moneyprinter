export const TRAILING_MONTHS = 6;

// Identity only (no `load`). MortgageCalculator.tsx (a client component)
// imports mortgage.ts, which references these signal objects by `.id` to
// call ctx.get(...) — it must never pull Prisma into the browser bundle.
// The Prisma-backed loader implementations live in signal-loaders.ts, a
// server-only module that only createServerContext (server-context.ts)
// imports. Mirrors the integrations/registry.ts (safe) vs
// integrations/client.ts (server-only) split already used in this codebase.
export interface Signal<T> {
  id: string;
  // Phantom: never present on a real value, only carries T so ctx.get<T>()
  // infers correctly from a Signal<T>'s declared type at the call site.
  readonly _type?: T;
}

export const liquidBalance: Signal<number> = { id: 'liquidBalance' };
export const netWorth: Signal<number> = { id: 'netWorth' };
export const monthlyIncome: Signal<number> = { id: 'monthlyIncome' };
export const monthlySurplus: Signal<number> = { id: 'monthlySurplus' };
