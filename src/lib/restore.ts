import { randomUUID } from 'node:crypto';
import { entitySchemas } from './schemas';
import { EXPORTABLE_ENTITIES, type ExportableEntity } from './constants';
import { restoreDb } from './restore-db';

type RecordData = Record<string, unknown>;
type SnapshotRow = { oldId: number; data: RecordData };
type Snapshot = Partial<Record<ExportableEntity, SnapshotRow[]>>;
const ORDER: ExportableEntity[] = ['accounts', 'income_sources', 'transfers', 'transactions', 'net_worth_history', 'income_budgets', 'budget_limits', 'goals', 'user_settings', 'categorization_rules', 'provenance'];

/** Account selectors are stored inside recursive filter JSON, rather than SQL FKs. */
function mapRuleAccounts(input: unknown, account: (id: unknown) => unknown): unknown {
  const node = input as RecordData;
  if (node.type === 'group') return { ...node, conditions: (node.conditions as unknown[]).map((child) => mapRuleAccounts(child, account)) };
  if (node.field !== 'account_id' || !['eq', 'neq', 'in', 'notIn'].includes(String(node.operator))) return node;
  if (node.operator === 'in' || node.operator === 'notIn') {
    if (!Array.isArray(node.value)) throw new Error('Invalid account reference list in backup rule');
    return { ...node, value: node.value.map(account) };
  }
  return { ...node, value: account(node.value) };
}

export function validateSnapshot(input: unknown): Snapshot {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid backup data');
  const snapshot: Snapshot = {};
  for (const [entity, rows] of Object.entries(input)) {
    if (!EXPORTABLE_ENTITIES.includes(entity as ExportableEntity) || !Array.isArray(rows)) throw new Error(`Invalid backup entity: ${entity}`);
    const ids = new Set<number>();
    snapshot[entity as ExportableEntity] = rows.map((row: RecordData) => {
      const oldId = Number(row.id);
      if (!Number.isSafeInteger(oldId) || oldId <= 0) throw new Error(`Invalid ${entity} ID`);
      if (ids.has(oldId)) throw new Error(`Duplicate ${entity} ID`);
      ids.add(oldId);
      const normalized = { ...row };
      if (entity === 'transactions' && normalized.type == null) normalized.type = 'expense';
      // Legacy exports represent nullable optional references as blank CSV cells.
      for (const key of ['account_id', 'income_source_id', 'last_updated']) {
        if (normalized[key] == null) delete normalized[key];
      }
      const data = entitySchemas[entity].parse(normalized) as RecordData;
      return { oldId, data };
    });
  }
  const find = (entity: ExportableEntity, id: unknown) => {
    const row = snapshot[entity]?.find((r) => r.oldId === Number(id));
    if (!row) throw new Error(`Missing ${entity} reference in backup`);
    return row.data;
  };
  for (const { data } of snapshot.categorization_rules ?? []) {
    mapRuleAccounts(data.conditions, (id) => { find('accounts', id); return id; });
  }
  const paymentLegs = new Set<string>();
  for (const row of snapshot.transfers ?? []) {
    const from = find('accounts', row.data.from_account_id);
    const to = find('accounts', row.data.to_account_id);
    if (from.currency !== to.currency) throw new Error('Transfer currencies differ');
  }
  for (const { oldId, data } of snapshot.transactions ?? []) {
    if (data.account_id != null) find('accounts', data.account_id);
    if (data.original_transaction_id != null) {
      const original = find('transactions', data.original_transaction_id);
      if (Number(data.original_transaction_id) === oldId || original.type !== 'expense' || original.account_id !== data.account_id) throw new Error('Invalid refund purchase reference');
    }
    if (data.transfer_id != null) {
      const transfer = find('transfers', data.transfer_id);
      const account = data.type === 'payment_out' ? transfer.from_account_id : transfer.to_account_id;
      if (data.account_id !== account || Math.round(Number(data.amount) * 100) !== Math.round(Number(transfer.amount) * 100)) throw new Error('Payment does not match transfer');
      const key = `${data.transfer_id}:${data.account_id}`;
      if (paymentLegs.has(key)) throw new Error('Duplicate payment leg in backup');
      paymentLegs.add(key);
    }
  }
  for (const { data } of snapshot.income_budgets ?? []) {
    if (data.income_source_id != null) find('income_sources', data.income_source_id);
  }
  for (const { data } of snapshot.provenance ?? []) {
    if (!EXPORTABLE_ENTITIES.includes(data.entity_type as ExportableEntity)) throw new Error('Invalid provenance entity reference');
    find(data.entity_type as ExportableEntity, data.entity_id);
    if (data.source_type === 'rule' && data.source_id != null) find('categorization_rules', data.source_id);
  }
  return snapshot;
}

/** Append a validated archive using newly allocated IDs; never reuse foreign IDs. */
export async function restoreSnapshot(userId: number, input: unknown): Promise<{ created: number; skipped: number }> {
  const snapshot = validateSnapshot(input);
  const batchId = randomUUID();
  return restoreDb.$transaction(async (tx) => {
    const idMaps = new Map<ExportableEntity, Map<number, number>>();
    const reference = (entity: ExportableEntity, id: unknown) => {
      if (id == null) return null;
      const mapped = idMaps.get(entity)?.get(Number(id));
      if (mapped == null) throw new Error(`Missing restored ${entity} reference`);
      return mapped;
    };
    let created = 0;
    let skipped = 0;
    for (const entity of ORDER) {
      const ids = new Map<number, number>();
      idMaps.set(entity, ids);
      for (const { oldId, data: original } of snapshot[entity] ?? []) {
        const data: RecordData = { ...original, user_id: userId };
        if (entity === 'transactions') {
          data.account_id = reference('accounts', data.account_id);
          data.transfer_id = reference('transfers', data.transfer_id);
          data.original_transaction_id = null; // second pass permits any archive order
        }
        if (entity === 'transfers') {
          data.from_account_id = reference('accounts', data.from_account_id);
          data.to_account_id = reference('accounts', data.to_account_id);
        }
        if (entity === 'income_budgets') data.income_source_id = reference('income_sources', data.income_source_id);
        if (entity === 'categorization_rules') data.conditions = mapRuleAccounts(data.conditions, (id) => reference('accounts', id));
        if (entity === 'provenance') {
          data.entity_id = reference(data.entity_type as ExportableEntity, data.entity_id);
          data.source_id = data.source_type === 'rule' ? reference('categorization_rules', data.source_id) : null;
        }
        // Delegates differ by entity; every data shape was validated above.
        const delegate = tx[entity] as unknown as {
          create(args: { data: RecordData }): Promise<{ id: number }>;
          findUnique(args: RecordData): Promise<{ id: number } | null>;
        };
        const where = entity === 'user_settings'
          ? { user_id_key: { user_id: userId, key: data.key } }
          : entity === 'budget_limits'
            ? { user_id_category: { user_id: userId, category: data.category } }
            : entity === 'net_worth_history'
              ? { user_id_date: { user_id: userId, date: data.date } }
              : null;
        const existing = where ? await delegate.findUnique({ where }) : null;
        if (existing) {
          ids.set(oldId, existing.id);
          skipped++;
          continue;
        }
        const row = await delegate.create({ data });
        ids.set(oldId, row.id);
        created++;
        // Settings can contain credentials and are intentionally unaudited.
        if (entity === 'user_settings') continue;
        // A restore is a related batch, not a set of independently undoable rows.
        await tx.audit_log.create({ data: {
          user_id: userId, entity_type: entity, entity_id: row.id, action: 'CREATE', batch_id: batchId,
          new_value: JSON.parse(JSON.stringify({ ...data, backup_restore: true })),
        } });
      }
    }
    for (const { oldId, data } of snapshot.transactions ?? []) {
      if (data.original_transaction_id != null) await tx.transactions.update({
        where: { id: reference('transactions', oldId)! },
        data: { original_transaction_id: reference('transactions', data.original_transaction_id) },
      });
    }
    return { created, skipped };
  }, { isolationLevel: 'Serializable', timeout: 60_000 });
}
