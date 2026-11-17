import { type Page } from '@playwright/test';
import { test, expect } from './support/fixtures';
import { withDb } from './support/db';

const postingDate = () => `${new Date().getFullYear()}-06-15`;

async function uploadStatement(page: Page, accountName: string, csv: string) {
  await page.goto('/import');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'statement.csv', mimeType: 'text/csv', buffer: Buffer.from(csv),
  });
  const account = page.getByRole('combobox', { name: 'Statement account' });
  await expect(account).toBeVisible();
  await account.click();
  await page.getByRole('option', { name: accountName, exact: true }).click();
}

async function importSelected(page: Page, count: number) {
  const button = page.getByRole('button', { name: `Import ${count} rows`, exact: true });
  await expect(button).toBeEnabled();
  await button.click();
  await page.waitForURL((url) => url.pathname === '/' && url.searchParams.get('tab') === 'transactions');
}

test('classifies an imported card refund and preserves its normalized magnitude', async ({ freshUser, freshUserPage: page }) => {
  await withDb((db) => db.query(
    "insert into accounts(user_id,name,type,balance) values ($1,'Import Card','credit',-70)", [freshUser.id],
  ));
  await uploadStatement(page, 'Import Card', [
    'Date,Description,Amount,Type,Category',
    `${postingDate()},Import clothing purchase,100,expense,clothing`,
    `${postingDate()},Import clothing return,-30,expense,clothing`,
  ].join('\n'));
  await expect(page.getByText('2 valid', { exact: true })).toBeVisible();
  const refundRow = page.locator('.ag-row').filter({ hasText: 'Import clothing return' });
  await refundRow.locator('[col-id="__purpose"]').dblclick();
  await refundRow.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Refund', exact: true }).click();
  await expect(refundRow.locator('[col-id="__purpose"]')).toHaveText('Refund');
  await expect(refundRow.locator('[col-id="__normalizedAmount"]')).toHaveText('30');
  await importSelected(page, 2);

  const rows = await withDb((db) => db.query(
    "select t.name,t.type,t.amount::float,a.name as account_name from transactions t join accounts a on a.id=t.account_id where t.user_id=$1 and t.name like 'Import clothing%' order by t.amount desc", [freshUser.id],
  ).then((result) => result.rows));
  expect(rows).toEqual([
    { name: 'Import clothing purchase', type: 'expense', amount: 100, account_name: 'Import Card' },
    { name: 'Import clothing return', type: 'refund', amount: 30, account_name: 'Import Card' },
  ]);
  // The persisted refund's category is retained, so spending reports can offset the purchase.
  expect(await withDb((db) => db.query(
    "select sum(case when type='refund' then -amount else amount end)::float as spending from transactions where user_id=$1 and tags='clothing'", [freshUser.id],
  ).then((result) => result.rows[0].spending))).toBe(70);
  await expect(page.getByRole('row').filter({ hasText: 'Import clothing return' }).getByRole('cell', { name: /^refund$/i })).toBeVisible();
});

test('imports both sides of a payment across accounts without treating them as duplicates and flags reimports', async ({ freshUser, freshUserPage: page }) => {
  await withDb((db) => db.query(
    "insert into accounts(user_id,name,type,balance) values ($1,'Payment Card','credit',0)", [freshUser.id],
  ));
  const checkingCsv = `Date,Description,Amount,Type\n${postingDate()},Card statement payment,100,payment_out`;
  const cardCsv = `Date,Description,Amount,Type\n${postingDate()},Card statement payment,100,payment_in`;
  await uploadStatement(page, 'E2E Checking', checkingCsv);
  await importSelected(page, 1);
  await uploadStatement(page, 'Payment Card', cardCsv);
  await expect(page.getByText('1 valid', { exact: true })).toBeVisible();
  await expect(page.getByText('1 duplicates', { exact: true })).toHaveCount(0);
  await importSelected(page, 1);

  const rows = await withDb((db) => db.query(
    "select type,amount::float,transfer_id from transactions where user_id=$1 and name='Card statement payment' order by type", [freshUser.id],
  ).then((result) => result.rows));
  expect(rows).toEqual([
    { type: 'payment_in', amount: 100, transfer_id: null },
    { type: 'payment_out', amount: 100, transfer_id: null },
  ]);
  await uploadStatement(page, 'E2E Checking', checkingCsv);
  await expect(page.getByText('1 duplicates', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import 0 rows', exact: true })).toBeDisabled();
});
