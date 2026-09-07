// Direct DB access for e2e provisioning/teardown (test process only — no
// production code path). Uses DATABASE_URL, falling back to the local docker DB.
import pg from 'pg';

const CONNECTION = process.env.DATABASE_URL ?? 'postgres://postgres:password@localhost:5433/moneyprinter';

export async function withDb<T>(fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: CONNECTION });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}
