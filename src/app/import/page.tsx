import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAccounts, getTransactionsForYear } from '@/lib/data';
import ImportSpreadsheet from '@/components/ImportSpreadsheet';

export const dynamic = 'force-dynamic';

export default async function ImportPage() {
  const userId = await getCurrentUser();
  if (!userId) redirect('/login');

  const [accounts, transactions] = await Promise.all([
    getAccounts(),
    getTransactionsForYear(new Date().getFullYear()),
  ]);

  return (
    <ImportSpreadsheet
      existingTransactions={transactions.map((t) => ({
        date: new Date(t.date),
        amount: t.amount,
        name: t.name,
      }))}
      accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
    />
  );
}
