import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/action-middleware';
import RuleForm, { type RuleFormInitial } from '@/components/RuleForm';
import type { Filter } from 'doom-design-system/filter';

export const dynamic = 'force-dynamic';

export default async function EditRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireAuth().catch(() => null);
  if (!userId) redirect('/login');
  const { id } = await params;
  const ruleId = parseInt(id, 10);
  if (isNaN(ruleId)) notFound();

  const rule = await prisma.categorization_rules.findFirst({
    where: { id: ruleId, user_id: userId, deleted_at: null },
  });
  if (!rule) notFound();

  const accounts = await prisma.accounts.findMany({
    where: { user_id: userId, deleted_at: null },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  const initial: RuleFormInitial = {
    id: rule.id,
    name: rule.name,
    enabled: rule.enabled,
    priority: rule.priority,
    conditions: rule.conditions as unknown as Filter,
    actions: rule.actions as unknown as {
      addTags: string[];
      setType?: 'income' | 'expense';
    },
  };

  return <RuleForm accounts={accounts} initial={initial} />;
}
