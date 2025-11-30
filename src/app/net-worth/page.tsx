import {  redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getNetWorthHistory } from '@/app/actions/networth';
import NetWorthHistoryTable from '@/components/NetWorthHistoryTable';
import { Page, Text } from '@design-system';

export default async function NetWorthPage() {
  const userId = await getCurrentUser();
  
  if (!userId) {
    redirect('/login');
  }

  const entries = await getNetWorthHistory();

  return (
    <Page>
      <header style={{ marginBottom: '2rem' }}>
        <Text variant="h2" weight="bold" style={{ marginBottom: '0.5rem' }}>
          Net Worth History
        </Text>
        <p className="text-muted">
          Track your net worth over time
        </p>
      </header>

      <NetWorthHistoryTable entries={entries} />
    </Page>
  );
}
