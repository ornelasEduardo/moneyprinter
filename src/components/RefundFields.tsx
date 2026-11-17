'use client';
import { useEffect, useState } from 'react';
import { Button, Flex, Select, Text } from 'doom-design-system';
import { getRefundPurchases } from '@/app/actions/transactions';
interface Props {accountId:number|null;onCopyTags:(tags:string)=>void;amount?:number;originalId?:number|null}
export default function RefundFields({accountId,onCopyTags,amount=0,originalId}:Props){
 const [purchases,setPurchases]=useState<Awaited<ReturnType<typeof getRefundPurchases>>>([]);
 const [selected,setSelected]=useState(originalId?String(originalId):'');
 const [error,setError]=useState('');
 useEffect(()=>{let active=true;setSelected(originalId?String(originalId):'');setPurchases([]);if(accountId)getRefundPurchases(accountId,originalId).then(rows=>{if(active)setPurchases(rows);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[accountId,originalId]);
 const purchase=purchases.find(p=>String(p.id)===selected);
 return <Flex direction="column" gap={2}>
  <Text variant="small">Refunds reduce spending using this entry’s tags and posting date.</Text>
  {!accountId ? <Text variant="small">Choose an account to link an original purchase.</Text> : <Select label="Original purchase (optional)" aria-label="Original purchase (optional)" name="originalTransactionId" value={selected} onChange={e=>setSelected(e.target.value)} options={[{value:'',label:'No purchase link'},...purchases.map(p=>({value:String(p.id),label:`${p.name} · ${p.date} · ${p.amount.toFixed(2)}`}))]} />}
  {purchase && <Button type="button" size="sm" variant="ghost" onClick={()=>onCopyTags(purchase.tags??'')}>Use purchase tags</Button>}
  {purchase && amount>purchase.amount && <Text color="warning" variant="small">This refund exceeds the original purchase. Check the amount before saving.</Text>}
  {error && <Text color="error">{error}</Text>}
 </Flex>;
}
