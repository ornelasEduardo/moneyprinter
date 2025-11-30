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
      <div className="mb-8">
        <Text variant="h2" weight="bold" className="mb-2">
          Net Worth History
        </Text>
        <Text color="muted">
          Track your net worth over time
        </Text>
      </div>

      <NetWorthHistoryTable entries={entries} />
    </Page>
  );
}
