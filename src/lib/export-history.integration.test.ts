import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { exportAllEntities } from './export';
import { restoreSnapshot } from './restore';
import { restoreDb } from './restore-db';
import { getRecentAuditLog, undoEntry, undoEntryBatch } from '@/app/actions/audit';
import prisma from './prisma';

const auth = vi.hoisted(() => ({ userId: 0 }));
vi.mock('@/lib/action-middleware', () => ({ requireAuth: vi.fn(async () => auth.userId) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
const enabled = process.env.RUN_PAYMENT_DB_TESTS === '1';
if (enabled && !process.env.DATABASE_URL?.includes('/moneyprinter_refunds_test')) throw new Error('Export/history tests require the disposable test database');
const db = new PrismaClient();
const users: number[] = [];
async function user() {
  const row = await db.users.create({ data: { username: `export_history_${randomUUID()}` } });
  users.push(row.id);
  return row.id;
}
describe.skipIf(!enabled)('export and history ownership against PostgreSQL', () => {
  afterEach(async () => {
    for (const userId of users.splice(0)) {
      for (const model of ['provenance', 'audit_log', 'transactions', 'accounts', 'categorization_rules'] as const) await (db[model] as unknown as { deleteMany(args: { where: { user_id: number } }): Promise<unknown> }).deleteMany({ where: { user_id: userId } });
      await db.users.delete({ where: { id: userId } });
    }
  });
  afterAll(async () => { await db.$disconnect(); await restoreDb.$disconnect(); await prisma.$disconnect(); });
  it('round-trips remaining data after deleting a tagged transaction and its source rule', async () => {
    const source = await user(); const target = await user();
    const account = await db.accounts.create({ data: { user_id: source, name: 'Checking', type: 'checking', balance: 100 } });
    const live = await db.transactions.create({ data: { user_id: source, account_id: account.id, name: 'Keep', type: 'expense', amount: 5, date: new Date(), tags: 'groceries' } });
    const removed = await db.transactions.create({ data: { user_id: source, account_id: account.id, name: 'Remove', type: 'expense', amount: 2, date: new Date(), tags: 'old' } });
    const rule = await db.categorization_rules.create({ data: { user_id: source, name: 'Old rule', conditions: {}, actions: {} } });
    await db.provenance.createMany({ data: [
      { user_id: source, entity_type: 'transactions', entity_id: live.id, field: 'tags', value: 'groceries', source_type: 'manual' },
      { user_id: source, entity_type: 'transactions', entity_id: removed.id, field: 'tags', value: 'old', source_type: 'manual' },
      { user_id: source, entity_type: 'transactions', entity_id: live.id, field: 'tags', value: 'groceries', source_type: 'rule', source_id: rule.id },
    ] });
    await prisma.transactions.delete({ where: { id: removed.id } });
    await prisma.categorization_rules.delete({ where: { id: rule.id } });
    expect((await db.transactions.findUniqueOrThrow({ where: { id: removed.id } })).deleted_at).not.toBeNull();
    const snapshot = await exportAllEntities(source);
    expect(snapshot.provenance).toHaveLength(1);
    await restoreSnapshot(target, snapshot);
    const transactions = await db.transactions.findMany({ where: { user_id: target } });
    expect(transactions.map(row => row.name)).toEqual(['Keep']);
    expect(transactions[0].tags).toBe('groceries');
    expect(await db.provenance.findMany({ where: { user_id: target } })).toMatchObject([{ entity_id: transactions[0].id, source_type: 'manual' }]);
  });
  it('isolates dummy credential history and rejects cross-profile entry and batch undo', async () => {
    const owner = await user(); const other = await user();
    const account = await db.accounts.create({ data: { user_id: other, name: 'Other account', type: 'checking', balance: 20 } });
    const batch = randomUUID();
    const secretEntry = await db.audit_log.create({ data: { user_id: other, entity_type: 'user_settings', entity_id: 1, action: 'CREATE', new_value: { value: 'dummy-other-profile-credential' } } });
    const change = await db.audit_log.create({ data: { user_id: other, entity_type: 'accounts', entity_id: account.id, action: 'UPDATE', batch_id: batch, previous_value: { balance: 10 }, new_value: { balance: 20 } } });
    await db.audit_log.create({ data: { user_id: owner, entity_type: 'user_settings', entity_id: 2, action: 'CREATE', new_value: { value: 'dummy-own-profile-credential' } } });
    auth.userId = owner;
    const history = await getRecentAuditLog();
    expect(history).toHaveLength(1);
    expect(history[0].user_id).toBe(owner);
    expect(history.some(row => row.id === secretEntry.id)).toBe(false);
    await expect(undoEntry(change.id)).rejects.toThrow(/not found/i);
    await undoEntryBatch(batch);
    expect(Number((await db.accounts.findUniqueOrThrow({ where: { id: account.id } })).balance)).toBe(20);
    expect((await db.audit_log.findUniqueOrThrow({ where: { id: change.id } })).undone_at).toBeNull();
  });
});
