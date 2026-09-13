import prisma from '@/lib/prisma';
import { splitTags } from '@/lib/tags';

// Shared reads for the categorization feature, used by both the streaming route
// handler and the server actions so the "what counts as untagged / what's the
// user's vocabulary" logic lives in one place.

// The user's own category taxonomy (distinct tags they've already applied). The
// model is constrained to this via an enum, so suggestions match their language.
export async function userVocabulary(userId: number): Promise<string[]> {
  const rows = await prisma.transactions.findMany({
    where: { user_id: userId, deleted_at: null, tags: { not: null } },
    select: { tags: true },
    distinct: ['tags'],
  });
  const set = new Set<string>();
  for (const r of rows) for (const t of splitTags(r.tags)) set.add(t);
  return Array.from(set).sort();
}

export interface UntaggedTxn {
  id: number;
  name: string;
  amount: unknown;
  type: string | null;
}

// Transactions with no tag yet, newest first. `take` bounds it; omit for all.
export async function untaggedTransactions(userId: number, take?: number): Promise<UntaggedTxn[]> {
  return prisma.transactions.findMany({
    where: { user_id: userId, deleted_at: null, OR: [{ tags: null }, { tags: '' }] },
    select: { id: true, name: true, amount: true, type: true },
    orderBy: { date: 'desc' },
    ...(take != null ? { take } : {}),
  });
}
