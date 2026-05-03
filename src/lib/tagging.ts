import { evaluateFilter, type Filter } from 'doom-design-system/filter';
import { normalizeTag, splitTags } from '@/lib/tags';

export interface CompiledRule {
  id: number;
  priority: number;
  conditions: Filter;
  actions: {
    addTags: string[];
    setType?: 'income' | 'expense';
  };
}

export interface RuleMatch {
  ruleId: number;
  priority: number;
  addTags: string[];
  setType?: 'income' | 'expense';
}

export interface ResolvedApplication {
  tag: string;
  ruleId: number;
}

export interface ResolveResult {
  tags: string[];
  type: 'income' | 'expense';
  applications: ResolvedApplication[];
  typeSource: { ruleId: number } | null;
}

export function evaluateRules(
  transaction: Record<string, unknown>,
  rules: CompiledRule[]
): RuleMatch[] {
  const matches: RuleMatch[] = [];
  for (const rule of rules) {
    if (evaluateFilter(rule.conditions, transaction)) {
      matches.push({
        ruleId: rule.id,
        priority: rule.priority,
        addTags: rule.actions.addTags,
        setType: rule.actions.setType,
      });
    }
  }
  return matches;
}

export function resolveMatches(
  currentTags: string[],
  currentType: 'income' | 'expense',
  matches: RuleMatch[]
): ResolveResult {
  const existing = new Set(currentTags.map(normalizeTag));
  const applications: ResolvedApplication[] = [];
  const finalTagSet = new Set(existing);

  for (const m of matches) {
    for (const raw of m.addTags) {
      const tag = normalizeTag(raw);
      if (!tag) continue;
      if (!existing.has(tag) && !finalTagSet.has(tag)) {
        finalTagSet.add(tag);
        applications.push({ tag, ruleId: m.ruleId });
        continue;
      }
      if (!existing.has(tag) && finalTagSet.has(tag)) {
        // tag was added by an earlier match in this loop — already recorded
        continue;
      }
    }
  }

  let type = currentType;
  let typeSource: { ruleId: number } | null = null;
  const typeSetters = matches.filter((m) => m.setType);
  if (typeSetters.length > 0) {
    const winner = typeSetters.reduce((a, b) => (a.priority >= b.priority ? a : b));
    type = winner.setType!;
    typeSource = { ruleId: winner.ruleId };
  }

  return {
    tags: [...finalTagSet],
    type,
    applications,
    typeSource,
  };
}

export { splitTags };

import prisma from '@/lib/prisma';
import {
  recordProvenance,
  findEntitiesBySource,
  stripBySource,
} from './provenance';

export interface ApplyRulesAtCreateInput {
  transactionId: number;
  userId: number;
  rules: CompiledRule[];
}

export async function applyRulesAtCreate(input: ApplyRulesAtCreateInput): Promise<void> {
  const { transactionId, userId, rules } = input;
  if (rules.length === 0) return;

  const tx = await prisma.transactions.findFirst({
    where: { id: transactionId, user_id: userId, deleted_at: null },
  });
  if (!tx) return;

  const matches = evaluateRules(
    {
      name: tx.name,
      amount: Number(tx.amount),
      type: tx.type,
      account_id: tx.account_id,
      tags: tx.tags ?? '',
      date: tx.date,
    },
    rules
  );
  if (matches.length === 0) return;

  const currentTags = splitTags(tx.tags);
  const currentType = (tx.type === 'income' ? 'income' : 'expense') as 'income' | 'expense';
  const resolved = resolveMatches(currentTags, currentType, matches);

  if (resolved.applications.length === 0 && !resolved.typeSource) return;

  await prisma.transactions.update({
    where: { id: transactionId },
    data: {
      tags: resolved.tags.join(','),
      type: resolved.type,
    },
  });

  for (const app of resolved.applications) {
    await recordProvenance({
      userId,
      entityType: 'transactions',
      entityId: transactionId,
      field: 'tags',
      value: app.tag,
      sourceType: 'rule',
      sourceId: app.ruleId,
    });
  }

  if (resolved.typeSource) {
    await recordProvenance({
      userId,
      entityType: 'transactions',
      entityId: transactionId,
      field: 'type',
      value: null,
      sourceType: 'rule',
      sourceId: resolved.typeSource.ruleId,
    });
  }
}

export async function addManualTag(transactionId: number, rawTag: string, userId: number): Promise<void> {
  const tag = normalizeTag(rawTag);
  if (!tag) return;
  const tx = await prisma.transactions.findFirst({
    where: { id: transactionId, user_id: userId, deleted_at: null },
  });
  if (!tx) return;
  const existing = splitTags(tx.tags);
  if (existing.includes(tag)) return;
  const next = [...existing, tag].join(',');
  await prisma.transactions.update({
    where: { id: transactionId },
    data: { tags: next },
  });
  await recordProvenance({
    userId,
    entityType: 'transactions',
    entityId: transactionId,
    field: 'tags',
    value: tag,
    sourceType: 'manual',
  });
}

export async function removeTag(transactionId: number, rawTag: string, userId: number): Promise<void> {
  const tag = normalizeTag(rawTag);
  if (!tag) return;
  const tx = await prisma.transactions.findFirst({
    where: { id: transactionId, user_id: userId, deleted_at: null },
  });
  if (!tx) return;
  const next = splitTags(tx.tags).filter((t) => t !== tag);
  await prisma.transactions.update({
    where: { id: transactionId },
    data: { tags: next.join(',') },
  });
  await prisma.provenance.deleteMany({
    where: { entity_type: 'transactions', entity_id: transactionId, field: 'tags', value: tag },
  });
}

export async function stripRuleApplications(ruleId: number, userId: number): Promise<void> {
  const apps = await findEntitiesBySource({ sourceType: 'rule', sourceId: ruleId });

  // Group by entity_id
  const tagsToRemoveByTx = new Map<number, string[]>();
  const typeResetTxIds: number[] = [];
  for (const app of apps) {
    if (app.entity_type !== 'transactions') continue;
    if (app.field === 'tags' && app.value) {
      const list = tagsToRemoveByTx.get(app.entity_id) ?? [];
      list.push(app.value);
      tagsToRemoveByTx.set(app.entity_id, list);
    } else if (app.field === 'type') {
      typeResetTxIds.push(app.entity_id);
    }
  }

  for (const [txId, tagsToRemove] of tagsToRemoveByTx) {
    const tx = await prisma.transactions.findFirst({
      where: { id: txId, user_id: userId, deleted_at: null },
    });
    if (!tx) continue;
    const remaining = splitTags(tx.tags).filter((t) => !tagsToRemove.includes(t));
    await prisma.transactions.update({
      where: { id: txId },
      data: { tags: remaining.join(',') },
    });
  }

  for (const txId of typeResetTxIds) {
    const tx = await prisma.transactions.findFirst({
      where: { id: txId, user_id: userId, deleted_at: null },
    });
    if (!tx) continue;
    // Reset to default 'expense' (the column default per schema).
    await prisma.transactions.update({
      where: { id: txId },
      data: { type: 'expense' },
    });
  }

  await stripBySource({ sourceType: 'rule', sourceId: ruleId });
}
