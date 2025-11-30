import { getAccounts } from '@/app/actions/transactions';
import TransactionForm from './TransactionForm';

export default async function AddTransactionPage() {
  const accounts = await getAccounts();

  return <TransactionForm accounts={accounts} />;
}
