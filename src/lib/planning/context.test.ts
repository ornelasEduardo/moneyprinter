import { describe, it, expect, vi } from 'vitest';
import type { Signal } from './signals';
import { createSnapshotContext } from './context';
import { createServerContext, snapshotOf } from './server-context';
import type { SignalLoader } from './signal-loaders';

// Server-side loaders now live in a registry keyed by signal id (rather than
// a `.load()` method on the signal object itself — see signal-loaders.ts),
// so a test signal supplies its loader via an injected map instead of an
// inline closure on the signal.
function countingSignal(id: string, value: number) {
  const load = vi.fn(async () => value);
  const signal = { id } as Signal<number>;
  const loaders: Record<string, SignalLoader> = { [id]: load };
  return { signal, loaders, load };
}

describe('FinancialContext', () => {
  it('memoizes: pulling a signal twice loads it once', async () => {
    const { signal, loaders, load } = countingSignal('a', 10);
    const ctx = createServerContext(2, loaders);
    expect(await ctx.get(signal)).toBe(10);
    expect(await ctx.get(signal)).toBe(10);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('snapshotOf captures resolved signals; snapshot context serves them synchronously', async () => {
    const { signal, loaders } = countingSignal('a', 42);
    const ctx = createServerContext(2, loaders);
    await ctx.get(signal);
    const snap = snapshotOf(ctx);
    expect(snap).toEqual({ a: 42 });

    const client = createSnapshotContext(snap);
    await expect(client.get(signal)).resolves.toBe(42);
  });

  it('snapshot context throws for a signal not in the snapshot', async () => {
    const { signal } = countingSignal('missing', 1);
    const client = createSnapshotContext({});
    await expect(client.get(signal)).rejects.toThrow(/missing/);
  });

  it('throws when no loader is registered for a signal', async () => {
    const ctx = createServerContext(2, {});
    await expect(ctx.get({ id: 'unregistered' } as Signal<number>)).rejects.toThrow(/unregistered/);
  });
});
