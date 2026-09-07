import { test, expect } from './support/fixtures';
import { createEphemeralUser, deleteEphemeralUser } from './support/users';
import { withDb } from './support/db';

const countUser = (id: number) =>
  withDb((c) => c.query('select count(*)::int as n from users where id = $1', [id]).then((r) => r.rows[0].n));

test.describe('ephemeral e2e users', () => {
  test('provision then delete round-trips (no leftover rows)', async () => {
    const user = await createEphemeralUser();
    expect(await countUser(user.id)).toBe(1);
    const accounts = await withDb((c) =>
      c.query('select count(*)::int as n from accounts where user_id = $1', [user.id]).then((r) => r.rows[0].n));
    expect(accounts).toBeGreaterThan(0); // seeded

    await deleteEphemeralUser(user.id);
    expect(await countUser(user.id)).toBe(0);
    const leftoverAccounts = await withDb((c) =>
      c.query('select count(*)::int as n from accounts where user_id = $1', [user.id]).then((r) => r.rows[0].n));
    expect(leftoverAccounts).toBe(0); // children cleaned up too
  });

  test('a fresh user is authenticated via cookie (no login UI) and isolated from the sandbox', async ({ freshUser, freshUserPage }) => {
    // Snapshot the shared sandbox (user_id 2) before we do anything as the fresh user.
    const sandboxBefore = await withDb((c) =>
      c.query("select key, value from user_settings where user_id = 2 order by key").then((r) => JSON.stringify(r.rows)));

    // No login step — the injected session cookie authenticates us.
    await freshUserPage.goto('/?tab=home');
    await expect(freshUserPage.getByText('MONEYPRINTER').first()).toBeVisible({ timeout: 20_000 });
    // The dashboard reflects THIS user's seed ($50,000 account balance), not the sandbox's numbers.
    await expect(freshUserPage.getByText('$50,000').first()).toBeVisible({ timeout: 20_000 });

    // Mutate this user's settings directly (what a settings action would persist),
    // then confirm the shared sandbox account is completely untouched.
    await withDb((c) =>
      c.query(
        `insert into user_settings (user_id, key, value) values ($1, 'col_mode', 'bea')
         on conflict (user_id, key) do update set value = excluded.value`,
        [freshUser.id],
      ));
    const sandboxAfter = await withDb((c) =>
      c.query("select key, value from user_settings where user_id = 2 order by key").then((r) => JSON.stringify(r.rows)));
    expect(sandboxAfter).toBe(sandboxBefore); // demo account never touched
  });
});
