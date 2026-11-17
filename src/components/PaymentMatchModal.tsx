'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Flex, Modal, RadioGroup, RadioGroupItem, Select, Text } from 'doom-design-system';
import { listPaymentCandidates, reconcilePayment } from '@/app/actions/payments';

interface Props { transactionId: number; accounts: { id:number; name:string }[]; onClose: () => void }
type Candidates = Awaited<ReturnType<typeof listPaymentCandidates>>;
export default function PaymentMatchModal({ transactionId, accounts, onClose }: Props) {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidates | null>(null);
  const [choice, setChoice] = useState('');
  const [account, setAccount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    listPaymentCandidates(transactionId).then(value => { if (active) setCandidates(value); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [transactionId]);
  async function confirm() {
    setBusy(true); setError('');
    try {
      const [kind, id] = choice.split(':');
      await reconcilePayment({ transactionId,
        ...(kind === 'payment' ? { counterpartTransactionId: Number(id) } : kind === 'transfer' ? { transferId: Number(id) } : { counterpartyAccountId: Number(account) }),
      });
      onClose(); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to match payment'); }
    finally { setBusy(false); }
  }
  return <Modal isOpen onClose={() => { if (!busy) onClose(); }}>
    <Modal.Header><Text variant="h5">Match account payment</Text></Modal.Header>
    <Modal.Body><Flex direction="column" gap={4}>
      <Text>Confirm which entry represents the other side of this payment. Payments stay out of income and spending while unmatched.</Text>
      {error && <Text role="alert" color="error">{error}</Text>}
      {!candidates && !error && <Text role="status">Loading matches…</Text>}
      {candidates && <>
        <Text variant="small" color="muted">Suggestions use the same amount and currency within seven days. Review each match before confirming.</Text>
        <RadioGroup name="payment-match" value={choice} onValueChange={setChoice}>
          {candidates.payments.map(p => <RadioGroupItem key={`p${p.id}`} value={`payment:${p.id}`}>{p.accountName} · {p.name} · {p.date.slice(0,10)} · {Number(p.amount).toFixed(2)} {p.currency}</RadioGroupItem>)}
          {candidates.transfers.map(t => <RadioGroupItem key={`t${t.id}`} value={`transfer:${t.id}`}>Existing transfer: {t.fromAccountName} → {t.toAccountName} · {t.date.slice(0,10)} · {Number(t.amount).toFixed(2)}</RadioGroupItem>)}
          <RadioGroupItem value="account">Other statement not imported — choose account</RadioGroupItem>
        </RadioGroup>
        {choice === 'account' && <Select aria-label="Other account" label="Other account" value={account} onChange={e => setAccount(e.target.value)} options={accounts.map(a => ({value:String(a.id),label:a.name}))} placeholder="Choose account" />}
      </>}
    </Flex></Modal.Body>
    <Modal.Footer><Flex gap={3} justify="flex-end">
      <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
      <Button onClick={confirm} disabled={busy || !choice || (choice === 'account' && !account)}>{busy ? 'Matching…' : 'Confirm match'}</Button>
    </Flex></Modal.Footer>
  </Modal>;
}
