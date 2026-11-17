import { test, expect } from './support/fixtures';
import { withDb } from './support/db';

async function seedPayments(userId: number, direction: 'payment_in' | 'payment_out', second = true) {
  return withDb(async c => {
    const checking = (await c.query('select id from accounts where user_id=$1', [userId])).rows[0].id;
    const card = (await c.query("insert into accounts(user_id,name,type,balance,currency) values($1,'E2E Card','credit',-500,'USD') returning id",[userId])).rows[0].id;
    await c.query("update accounts set currency='USD' where id=$1",[checking]);
    const ids = { payment_in: card, payment_out: checking };
    const first = (await c.query("insert into transactions(user_id,account_id,name,amount,date,type) values($1,$2,'Statement payment',250,current_date,$3) returning id", [userId,ids[direction],direction])).rows[0].id;
    if(second) await c.query("insert into transactions(user_id,account_id,name,amount,date,type) values($1,$2,'Other statement payment',250,current_date,$3)",[userId,ids[direction==='payment_in'?'payment_out':'payment_in'],direction==='payment_in'?'payment_out':'payment_in']);
    return {first,checking,card};
  });
}

test('refund entry reduces spending and never increases income',async({freshUser,freshUserPage:page})=>{
  await page.goto('/transactions/new');
  await page.getByRole('radio',{name:'Refund',exact:true}).press('Space');
  await page.locator('input[name="name"]').fill('E2E merchant refund');
  await page.locator('input[name="amount"]').fill('30');
  await page.getByRole('combobox',{name:'Account',exact:true}).click();
  await page.getByRole('option',{name:'E2E Checking'}).click();
  await page.getByRole('button',{name:'Add Transaction',exact:true}).click();
  await expect(page).toHaveURL(/tab=transactions/);
  await expect(page.getByText('E2E merchant refund',{exact:true})).toBeVisible();
  const result=await withDb(c=>c.query('select type,amount from transactions where user_id=$1 and name=$2',[freshUser.id,'E2E merchant refund']));
  expect(result.rows).toEqual([{type:'refund',amount:'30.00'}]);
  await page.goto('/?tab=home');
  // Seeded spending is 5500, and refund contributes -30.
  await expect(page.getByText(/5,470/).first()).toBeVisible();
});

for(const direction of ['payment_in','payment_out'] as const) {
 test(`confirms one transfer when ${direction} arrives first and can unlink`,async({freshUser,freshUserPage:page})=>{
  await seedPayments(freshUser.id,direction);
  await page.goto('/?tab=transactions');
  await page.getByRole('button',{name:'Match payment Statement payment',exact:true}).click();
  const choice=page.getByRole('radio',{name:/Other statement payment/});
  await expect(choice).toBeVisible();
  expect((await withDb(c=>c.query('select id from transfers where user_id=$1',[freshUser.id]))).rowCount).toBe(0);
  await choice.press('Space');
  await page.getByRole('button',{name:'Confirm match',exact:true}).click();
  await expect(page.getByText('Match account payment',{exact:true})).not.toBeVisible();
  await expect(page.getByTestId('movement-row-transfer')).toHaveCount(1);
  const rows=await withDb(c=>c.query('select transfer_id from transactions where user_id=$1 and type like $2',[freshUser.id,'payment_%']));
  expect(rows.rows).toHaveLength(2);expect(rows.rows[0].transfer_id).toBeTruthy();expect(rows.rows[0].transfer_id).toBe(rows.rows[1].transfer_id);
  await page.getByTestId('movement-row-transfer').click();
  await expect(page.getByText('Linked statement entries',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Unlink Statement payment',exact:true}).click();
  await page.getByRole('button',{name:'Confirm unlink',exact:true}).click();
  await expect(page.getByRole('button',{name:'Match payment Statement payment',exact:true})).toBeVisible();
 });
}

test('a later statement attaches to an existing single-sided payment without another transfer',async({freshUser,freshUserPage:page})=>{
 const {card,checking}=await seedPayments(freshUser.id,'payment_out',false);
 await page.goto('/?tab=transactions');
 await page.getByRole('button',{name:'Match payment Statement payment',exact:true}).click();
 await page.getByRole('radio',{name:/Other statement not imported/}).press('Space');
 await page.getByRole('combobox',{name:'Other account',exact:true}).click();
 await page.getByRole('option',{name:'E2E Card'}).click();
 await page.getByRole('button',{name:'Confirm match',exact:true}).click();
 await expect(page.getByTestId('movement-row-transfer')).toHaveCount(1);
 await withDb(c=>c.query("insert into transactions(user_id,account_id,name,amount,date,type) values($1,$2,'Late statement',250,current_date,'payment_in')",[freshUser.id,card]));
 await page.reload();
 await page.getByRole('button',{name:'Match payment Late statement',exact:true}).click();
 await page.getByRole('radio',{name:/Existing transfer/}).press('Space');
 await page.getByRole('button',{name:'Confirm match',exact:true}).click();
 await expect(page.getByRole('button',{name:'Match payment Late statement',exact:true})).not.toBeVisible();
 await expect(page.getByTestId('movement-row-transfer')).toHaveCount(1);
 const linked=await withDb(c=>c.query('select transfer_id from transactions where user_id=$1 and type like $2',[freshUser.id,'payment_%']));
 expect(linked.rows).toHaveLength(2);
 expect(linked.rows.every(r=>r.transfer_id===linked.rows[0].transfer_id && r.transfer_id!=null)).toBe(true);
 const transfers=await withDb(c=>c.query('select from_account_id,to_account_id from transfers where user_id=$1 and deleted_at is null',[freshUser.id]));
 expect(transfers.rows).toEqual([{from_account_id:checking,to_account_id:card}]);
 await page.screenshot({path:'test-results/refunds-payment-transfer.png',fullPage:true});
});
