import { test, expect } from './support/fixtures';
import { withDb } from './support/db';
import JSZip from 'jszip';

test('downloads and restores a backup whose expanded settings exceed the Server Action limit', async ({ freshUser, freshUserPage: page }) => {
  const key = 'test.large-restore';
  const value = 'local-test-data-'.repeat(80_000);
  expect(Buffer.byteLength(value)).toBeGreaterThan(1024 * 1024);
  await withDb(c => c.query('insert into user_settings(user_id,key,value) values($1,$2,$3)', [freshUser.id,key,value]));
  const download = await page.request.get('/api/export?format=zip&type=backup');
  expect(download.status()).toBe(200);
  const archive = await download.body();
  const zip = await JSZip.loadAsync(archive);
  expect((await zip.file('user_settings.json')!.async('uint8array')).byteLength).toBeGreaterThan(1024 * 1024);
  await withDb(c => c.query('delete from user_settings where user_id=$1 and key=$2', [freshUser.id,key]));

  await page.goto('/?tab=data');
  await page.getByRole('tab', { name: 'Backup', exact: true }).click();
  await page.getByLabel('Backup archive', { exact: true }).setInputFiles({ name: 'large-backup.zip', mimeType:'application/zip', buffer:archive });
  await expect(page.getByText(/records ready to restore/)).toBeVisible();
  const responsePromise = page.waitForResponse(r => r.url().endsWith('/api/restore') && r.request().method() === 'POST');
  await page.getByRole('button', { name:'Restore copies',exact:true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  await expect(page.getByText(/Restored \d+ records\. Existing records were preserved\./)).toBeVisible();
  const restored = await withDb(c => c.query('select length(value)::int as n from user_settings where user_id=$1 and key=$2',[freshUser.id,key]));
  expect(restored.rows).toEqual([{n:value.length}]);
  // Restoring credentials/settings must not duplicate their values into history.
  const history = await withDb(c => c.query("select count(*)::int as n from audit_log where user_id=$1 and entity_type='user_settings'",[freshUser.id]));
  expect(history.rows[0].n).toBe(0);
});
