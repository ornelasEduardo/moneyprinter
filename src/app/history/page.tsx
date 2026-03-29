import { Page } from 'doom-design-system';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getRecentAuditLog } from '@/app/actions/audit';
import { runIntegrityChecks } from '@/lib/integrity';
import HistoryClient from './HistoryClient';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const userId = await getCurrentUser();
  if (!userId) {
    redirect('/login');
  }

  const [entries, warnings] = await Promise.all([
    getRecentAuditLog(),
    runIntegrityChecks(),
  ]);

  const serializedEntries = entries.map((e) => ({
    ...e,
    created_at: e.created_at.toISOString(),
    undone_at: e.undone_at ? e.undone_at.toISOString() : null,
    previous_value: e.previous_value as Record<string, unknown> | null,
    new_value: e.new_value as Record<string, unknown> | null,
  }));

  return (
    <Page>
      <HistoryClient entries={serializedEntries} warnings={warnings} />
    </Page>
  );
}
