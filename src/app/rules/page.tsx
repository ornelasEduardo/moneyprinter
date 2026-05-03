import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/action-middleware';
import { evaluateFilter, type Filter } from 'doom-design-system/filter';
import RulesClient from './RulesClient';

export const dynamic = 'force-dynamic';

export default async function RulesPage() {
  const userId = await requireAuth().catch(() => null);
  if (!userId) redirect('/login');

  const rules = await prisma.categorization_rules.findMany({
    where: { user_id: userId, deleted_at: null },
    orderBy: [{ enabled: 'desc' }, { priority: 'desc' }],
  });

  const txs = await prisma.transactions.findMany({
    where: { user_id: userId, deleted_at: null },
    select: {
      id: true,
      name: true,
      amount: true,
      type: true,
      account_id: true,
      tags: true,
      date: true,
    },
  });

  const items = rules.map((r: any) => {
    const filter = r.conditions as Filter;
    let matchCount = 0;
    for (const t of txs) {
      if (
        evaluateFilter(filter, {
          name: t.name,
          amount: Number(t.amount),
          type: t.type,
          account_id: t.account_id,
          tags: t.tags ?? '',
          date: t.date,
        })
      ) {
        matchCount++;
      }
    }
    return {
      id: r.id,
      name: r.name,
      enabled: r.enabled,
      priority: r.priority,
      matchCount,
    };
  });

  return <RulesClient rules={items} />;
}
