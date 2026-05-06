'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/action-middleware';
import { withAuditContext } from '@/lib/audit-context';
import { categorizationRuleSchema } from '@/lib/schemas';
import { applyRulesAtCreate, stripRuleApplications, type CompiledRule } from '@/lib/tagging';
import { demoteToManual } from '@/lib/provenance';
import { evaluateFilter, type Filter } from 'doom-design-system/filter';

function parse(formData: FormData) {
  const conditionsRaw = formData.get('conditions') as string;
  const actionsRaw = formData.get('actions') as string;
  let conditions: unknown;
  let actions: unknown;
  try {
    conditions = JSON.parse(conditionsRaw);
  } catch {
    throw new Error('Invalid conditions JSON');
  }
  try {
    actions = JSON.parse(actionsRaw);
  } catch {
    throw new Error('Invalid actions JSON');
  }
  return categorizationRuleSchema.parse({
    name: formData.get('name'),
    enabled: formData.get('enabled'),
    priority: formData.get('priority'),
    conditions,
    actions,
  });
}

export async function createRule(formData: FormData) {
  const userId = await requireAuth();
  const fields = parse(formData);

  return withAuditContext({ userId }, async () => {
    await prisma.categorization_rules.create({
      data: {
        user_id: userId,
        name: fields.name,
        enabled: fields.enabled,
        priority: fields.priority,
        conditions: fields.conditions as never,
        actions: fields.actions as never,
      },
    });
    revalidatePath('/rules');
    revalidatePath('/');
  });
}

export async function updateRule(id: number, formData: FormData) {
  const userId = await requireAuth();
  const fields = parse(formData);

  return withAuditContext({ userId }, async () => {
    const existing = await prisma.categorization_rules.findFirst({
      where: { id, user_id: userId, deleted_at: null },
    });
    if (!existing) throw new Error('Rule not found or unauthorized');

    await prisma.categorization_rules.update({
      where: { id },
      data: {
        name: fields.name,
        enabled: fields.enabled,
        priority: fields.priority,
        conditions: fields.conditions as never,
        actions: fields.actions as never,
        updated_at: new Date(),
      },
    });
    revalidatePath('/rules');
    revalidatePath('/');
  });
}

export async function deleteRule(id: number, opts: { stripApplications: boolean }) {
  const userId = await requireAuth();

  return withAuditContext({ userId }, async () => {
    if (opts.stripApplications) {
      await stripRuleApplications(id, userId);
    }
    const result = await prisma.categorization_rules.deleteMany({
      where: { id, user_id: userId },
    });
    if (result.count === 0) throw new Error('Rule not found or unauthorized');
    if (!opts.stripApplications) {
      await demoteToManual({ sourceType: 'rule', sourceId: id });
    }
    revalidatePath('/rules');
    revalidatePath('/');
  });
}

export async function listRules() {
  const userId = await requireAuth();
  return prisma.categorization_rules.findMany({
    where: { user_id: userId, deleted_at: null },
    orderBy: [{ enabled: 'desc' }, { priority: 'desc' }],
  });
}

export async function getRule(id: number) {
  const userId = await requireAuth();
  return prisma.categorization_rules.findFirst({
    where: { id, user_id: userId, deleted_at: null },
  });
}

async function fetchRuleAsCompiled(id: number, userId: number): Promise<CompiledRule | null> {
  const r = await prisma.categorization_rules.findFirst({
    where: { id, user_id: userId, deleted_at: null },
  });
  if (!r) return null;
  return {
    id: r.id,
    priority: r.priority,
    conditions: r.conditions as unknown as Filter,
    actions: r.actions as unknown as { addTags: string[]; setType?: 'income' | 'expense' },
  };
}

async function findRuleMatches(rule: CompiledRule, userId: number) {
  const txs = await prisma.transactions.findMany({
    where: { user_id: userId, deleted_at: null },
  });
  return txs.filter((t) =>
    evaluateFilter(rule.conditions, {
      name: t.name,
      amount: Number(t.amount),
      type: t.type,
      account_id: t.account_id,
      tags: t.tags ?? '',
      date: t.date,
    })
  );
}

export async function previewRuleAgainstHistory(id: number) {
  const userId = await requireAuth();
  const rule = await fetchRuleAsCompiled(id, userId);
  if (!rule) throw new Error('Rule not found or unauthorized');

  const matches = await findRuleMatches(rule, userId);
  return {
    matches: matches.map((t) => ({
      id: t.id,
      name: t.name,
      amount: Number(t.amount),
      date: t.date instanceof Date ? t.date.toISOString().slice(0, 10) : String(t.date),
      type: t.type,
    })),
  };
}

export async function applyRuleToHistory(id: number): Promise<{ applied: number }> {
  const userId = await requireAuth();
  const rule = await fetchRuleAsCompiled(id, userId);
  if (!rule) throw new Error('Rule not found or unauthorized');

  return withAuditContext({ userId }, async () => {
    const matches = await findRuleMatches(rule, userId);
    for (const tx of matches) {
      await applyRulesAtCreate({
        transactionId: tx.id,
        userId,
        rules: [rule],
      });
    }
    revalidatePath('/');
    revalidatePath('/rules');
    return { applied: matches.length };
  });
}
