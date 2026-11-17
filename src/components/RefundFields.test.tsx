import { render, screen, fireEvent } from '@/test-utils';
import { describe,it,expect,vi } from 'vitest';
import RefundFields from './RefundFields';
vi.mock('@/app/actions/transactions',()=>({getRefundPurchases:vi.fn(async()=>[{id:9,name:'Jacket',amount:100,tags:'clothing',date:'2026-11-01'}])}));
describe('refund purchase link',()=>{
  it('offers an optional purchase link and allows copying its tags',async()=>{
    const copy=vi.fn();
    render(<RefundFields accountId={1} onCopyTags={copy} amount={130}/>);
    fireEvent.click(await screen.findByRole('combobox',{name:'Original purchase (optional)'}));
    fireEvent.click(await screen.findByRole('option',{name:/Jacket/}));
    fireEvent.click(screen.getByRole('button',{name:'Use purchase tags'}));
    expect(copy).toHaveBeenCalledWith('clothing');
    expect(screen.getByText(/exceeds the original purchase/i)).toBeVisible();
  });
});
