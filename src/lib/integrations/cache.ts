// A tiny per-user cache for integration results, stored locally in user_settings
// under one JSON key. It's keyed by a `signature` (the inputs that produced the
// value) so a change — a new region, a new query — misses instead of returning
// stale-for-the-wrong-inputs data, and bounded by `maxAgeMs` so values refresh
// on schedule. Reusable by any integration (BEA today, others later).
import prisma from '@/lib/prisma';

export interface CacheEntry<T> {
  signature: string;
  fetchedAt: number; // epoch ms
  value: T;
}

export async function readCache<T>(
  userId: number,
  key: string,
  signature: string,
  maxAgeMs: number,
): Promise<T | undefined> {
  const row = await prisma.user_settings.findUnique({
    where: { user_id_key: { user_id: userId, key } },
  });
  if (!row?.value) return undefined;
  let entry: CacheEntry<T>;
  try {
    entry = JSON.parse(row.value);
  } catch {
    return undefined;
  }
  if (entry?.signature !== signature) return undefined; // inputs changed
  if (!Number.isFinite(entry.fetchedAt) || Date.now() - entry.fetchedAt > maxAgeMs) return undefined; // stale
  return entry.value;
}

export async function writeCache<T>(userId: number, key: string, signature: string, value: T): Promise<void> {
  const payload = JSON.stringify({ signature, fetchedAt: Date.now(), value } satisfies CacheEntry<T>);
  await prisma.user_settings.upsert({
    where: { user_id_key: { user_id: userId, key } },
    create: { user_id: userId, key, value: payload },
    update: { value: payload },
  });
}

// Return the cached value for `signature` if fresh, else run `fetcher`, cache
// its result, and return it. A fetcher error propagates (nothing is cached).
export async function withCache<T>(
  userId: number,
  key: string,
  signature: string,
  maxAgeMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const hit = await readCache<T>(userId, key, signature, maxAgeMs);
  if (hit !== undefined) return hit;
  const value = await fetcher();
  await writeCache(userId, key, signature, value);
  return value;
}
