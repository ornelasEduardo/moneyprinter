import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: { user_settings: { findUnique: vi.fn(), upsert: vi.fn() } },
}));

import prisma from '@/lib/prisma';
import { readCache, writeCache, withCache } from './cache';

const stored = (entry: unknown) => (prisma.user_settings.findUnique as any).mockResolvedValue({ value: JSON.stringify(entry) });
const DAY = 24 * 60 * 60 * 1000;

describe('readCache', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the value on a fresh signature match', async () => {
    stored({ signature: 'rents:41740', fetchedAt: Date.now(), value: { front: 0.43 } });
    expect(await readCache(2, 'k', 'rents:41740', 30 * DAY)).toEqual({ front: 0.43 });
  });

  it('misses when the signature differs (inputs changed)', async () => {
    stored({ signature: 'rents:99999', fetchedAt: Date.now(), value: { front: 0.43 } });
    expect(await readCache(2, 'k', 'rents:41740', 30 * DAY)).toBeUndefined();
  });

  it('misses when the entry is stale', async () => {
    stored({ signature: 'rents:41740', fetchedAt: Date.now() - 100 * DAY, value: { front: 0.43 } });
    expect(await readCache(2, 'k', 'rents:41740', 30 * DAY)).toBeUndefined();
  });

  it('misses when nothing is cached', async () => {
    (prisma.user_settings.findUnique as any).mockResolvedValue(null);
    expect(await readCache(2, 'k', 'rents:41740', 30 * DAY)).toBeUndefined();
  });
});

describe('writeCache', () => {
  it('upserts an entry carrying the signature + value', async () => {
    (prisma.user_settings.upsert as any).mockResolvedValue({});
    await writeCache(2, 'k', 'rents:41740', { front: 0.43 });
    const payload = JSON.parse((prisma.user_settings.upsert as any).mock.calls[0][0].create.value);
    expect(payload).toMatchObject({ signature: 'rents:41740', value: { front: 0.43 } });
    expect(typeof payload.fetchedAt).toBe('number');
  });
});

describe('withCache', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the cached value without calling the fetcher on a hit', async () => {
    stored({ signature: 'rents:41740', fetchedAt: Date.now(), value: { front: 0.43 } });
    const fetcher = vi.fn();
    expect(await withCache(2, 'k', 'rents:41740', 30 * DAY, fetcher)).toEqual({ front: 0.43 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('fetches and writes through on a miss', async () => {
    (prisma.user_settings.findUnique as any).mockResolvedValue(null);
    (prisma.user_settings.upsert as any).mockResolvedValue({});
    const fetcher = vi.fn(async () => ({ front: 0.5 }));
    expect(await withCache(2, 'k', 'rents:41740', 30 * DAY, fetcher)).toEqual({ front: 0.5 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(prisma.user_settings.upsert).toHaveBeenCalled();
  });
});
