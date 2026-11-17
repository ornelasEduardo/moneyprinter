'use client';
import { useEffect, useState } from 'react';
import { Button, Flex, Text } from 'doom-design-system';
import { listLinkedPayments, unlinkPayment } from '@/app/actions/payments';
import { ConfirmDialog } from './ConfirmDialog';
interface Props { transferId:number; onLoaded:(count:number)=>void; onUnlinked:()=>void }
export default function LinkedPayments({transferId,onLoaded,onUnlinked}:Props) {
  const [entries,setEntries] = useState<Awaited<ReturnType<typeof listLinkedPayments>>>([]);
  const [selected,setSelected] = useState<number|null>(null);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  useEffect(() => {
    let active=true;
    listLinkedPayments(transferId).then(rows=>{if(active){setEntries(rows);onLoaded(rows.length);}}).catch(e=>{if(active)setError(e.message);});
    return ()=>{active=false;};
  },[transferId,onLoaded]);
  async function confirm() {
    if(selected==null)return;
    setBusy(true);
    try {await unlinkPayment(selected);onUnlinked();}
    catch(e){setError(e instanceof Error?e.message:'Unable to unlink payment');}
    finally {setBusy(false);setSelected(null);}
  }
  return <Flex direction="column" gap={3}>
    {error && <Text color="error">{error}</Text>}
    {entries.length>0 && <><Text weight="bold">Linked statement entries</Text><Text variant="small">Unlink entries before changing or deleting this transfer.</Text></>}
    {entries.map(p=><Flex key={p.id} direction="column" gap={2}>
      <Text>{p.accountName} · {p.name} · {p.date.slice(0,10)} · {Number(p.amount).toFixed(2)}</Text>
      <Button type="button" variant="ghost" disabled={busy} aria-label={`Unlink ${p.name}`} onClick={()=>setSelected(p.id)}>Unlink entry</Button>
    </Flex>)}
    <ConfirmDialog isOpen={selected!==null} onClose={()=>setSelected(null)} onConfirm={confirm} title="Unlink statement entry?" message="The entry will return to unmatched payments. If this is the last linked entry, the transfer will be removed. Your statement record is preserved." confirmText="Confirm unlink" />
  </Flex>;
}
