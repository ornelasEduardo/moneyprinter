import { describe, it, expect, vi } from 'vitest';
import type { Signal } from './signals';
import { createServerContext, snapshotOf, createSnapshotContext } from './context';

function countingSignal(id: string, value: number) {
  const load = vi.fn(async () => value);
  return { signal: { id, load } as Signal<number>, load };
}

describe('FinancialContext', () => {
  it('memoizes: pulling a signal twice loads it once', async () => {
    const { signal, load } = countingSignal('a', 10);
    const ctx = createServerContext(2);
    expect(await ctx.get(signal)).toBe(10);
    expect(await ctx.get(signal)).toBe(10);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('snapshotOf captures resolved signals; snapshot context serves them synchronously', async () => {
    const { signal } = countingSignal('a', 42);
    const ctx = createServerContext(2);
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
});
