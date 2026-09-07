import crypto from 'crypto';
import { withDb } from './db';

export interface EphemeralUser {
  id: number;
  username: string;
  sessionToken: string;
}

export async function createEphemeralUser(opts: { seed?: boolean } = {}): Promise<EphemeralUser> {
  const username = `e2e_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 2 * 60 * 60 * 1000);

  return withDb(async (client) => {
    const { rows } = await client.query(
      `insert into users (username, display_name, is_sandbox, session_token, session_expires_at)
       values ($1, 'E2E Ephemeral', true, $2, $3) returning id`,
      [username, sessionToken, expires],
    );
    const id: number = rows[0].id;

    if (opts.seed !== false) {
      const { rows: acct } = await client.query(
        `insert into accounts (user_id, name, type, balance) values ($1, 'E2E Checking', 'checking', 50000) returning id`,
        [id],
      );
      const accountId: number = acct[0].id;
      const now = new Date();
      const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-05`;
      await client.query(
        `insert into transactions (user_id, account_id, amount, date, name, type) values
           ($1, $2, 8000, $3, 'E2E Salary', 'income'),
           ($1, $2, 5500, $3, 'E2E Rent', 'expense')`,
        [id, accountId, day],
      );
    }

    return { id, username, sessionToken };
  });
}

export async function deleteEphemeralUser(id: number): Promise<void> {
  await withDb(async (client) => {
    await client.query('begin');
    // session_replication_role=replica skips FK checks, so rows delete in any order.
    await client.query('set local session_replication_role = replica');
    const { rows } = await client.query(
      `select table_name from information_schema.columns
       where column_name = 'user_id' and table_schema = 'public' and table_name <> 'users'`,
    );
    for (const r of rows) {
      await client.query(`delete from "${r.table_name}" where user_id = $1`, [id]);
    }
    await client.query('delete from users where id = $1', [id]);
    await client.query('commit');
  });
}
