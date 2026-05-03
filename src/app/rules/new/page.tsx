import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/action-middleware';
import RuleForm from '@/components/RuleForm';

export const dynamic = 'force-dynamic';

export default async function NewRulePage() {
  const userId = await requireAuth().catch(() => null);
  if (!userId) redirect('/login');

  const accounts = await prisma.accounts.findMany({
    where: { user_id: userId, deleted_at: null },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  return <RuleForm accounts={accounts} />;
}
