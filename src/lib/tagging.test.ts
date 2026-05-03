import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateRules, resolveMatches, type CompiledRule } from './tagging';
import type { Filter } from 'doom-design-system/filter';

const rule = (overrides: Partial<CompiledRule> = {}): CompiledRule => ({
  id: 1,
  priority: 0,
  conditions: { type: 'condition', field: 'name', operator: 'contains', value: 'Starbucks' },
  actions: { addTags: ['coffee'] },
  ...overrides,
});

describe('evaluateRules', () => {
  it('returns matches for rules whose conditions match the transaction', () => {
    const rules = [rule(), rule({ id: 2, conditions: { type: 'condition', field: 'name', operator: 'contains', value: 'Tea' } })];
    const tx = { name: 'Starbucks #123', amount: 5, type: 'expense' };
    const matches = evaluateRules(tx, rules);
    expect(matches).toHaveLength(1);
    expect(matches[0].ruleId).toBe(1);
    expect(matches[0].addTags).toEqual(['coffee']);
  });

  it('returns empty array when no rules match', () => {
    const matches = evaluateRules({ name: 'Random', amount: 1, type: 'expense' }, [rule()]);
    expect(matches).toEqual([]);
  });

  it('handles compound AND conditions correctly', () => {
    const compound: Filter = {
      type: 'group',
      conditions: [
        { type: 'condition', field: 'name', operator: 'contains', value: 'Amazon' },
        { type: 'condition', field: 'amount', operator: 'lt', value: 50, logic: 'and' },
      ],
    };
    const rules = [rule({ id: 9, conditions: compound, actions: { addTags: ['shopping'] } })];
    expect(evaluateRules({ name: 'Amazon.com', amount: 30, type: 'expense' }, rules)).toHaveLength(1);
    expect(evaluateRules({ name: 'Amazon.com', amount: 200, type: 'expense' }, rules)).toHaveLength(0);
  });

  it('preserves priority on each match', () => {
    const rules = [rule({ id: 1, priority: 5 }), rule({ id: 2, priority: 10, conditions: { type: 'condition', field: 'name', operator: 'contains', value: 'Star' } })];
    const tx = { name: 'Starbucks', amount: 5, type: 'expense' };
    const matches = evaluateRules(tx, rules);
    expect(matches.find((m) => m.ruleId === 1)?.priority).toBe(5);
    expect(matches.find((m) => m.ruleId === 2)?.priority).toBe(10);
  });
});

describe('resolveMatches', () => {
  it('unions tags across all matches, deduped and normalized', () => {
    const matches = [
      { ruleId: 1, priority: 0, addTags: ['coffee', 'morning'] },
      { ruleId: 2, priority: 0, addTags: ['coffee', 'treat'] },
    ];
    const r = resolveMatches(['existing'], 'expense', matches);
    expect(r.tags.sort()).toEqual(['coffee', 'existing', 'morning', 'treat'].sort());
  });

  it('preserves existing manual tags', () => {
    const r = resolveMatches(['manual-tag'], 'expense', [
      { ruleId: 1, priority: 0, addTags: ['rule-tag'] },
    ]);
    expect(r.tags).toContain('manual-tag');
    expect(r.tags).toContain('rule-tag');
    expect(r.applications).toEqual([{ tag: 'rule-tag', ruleId: 1 }]);
  });

  it('does NOT record application for tags that already existed', () => {
    const r = resolveMatches(['coffee'], 'expense', [
      { ruleId: 1, priority: 0, addTags: ['coffee'] },
    ]);
    expect(r.tags).toEqual(['coffee']);
    expect(r.applications).toEqual([]);
  });

  it('sets type from highest-priority match when multiple set type', () => {
    const matches = [
      { ruleId: 1, priority: 5, addTags: [], setType: 'expense' as const },
      { ruleId: 2, priority: 10, addTags: [], setType: 'income' as const },
    ];
    const r = resolveMatches([], 'expense', matches);
    expect(r.type).toBe('income');
    expect(r.typeSource).toEqual({ ruleId: 2 });
  });

  it('does not change type when no match sets one', () => {
    const r = resolveMatches([], 'expense', [{ ruleId: 1, priority: 0, addTags: ['x'] }]);
    expect(r.type).toBe('expense');
    expect(r.typeSource).toBeNull();
  });

  it('normalizes tags via normalizeTag when applying', () => {
    const r = resolveMatches([], 'expense', [
      { ruleId: 1, priority: 0, addTags: ['  Coffee  ', 'TREAT'] },
    ]);
    expect(r.tags).toEqual(['coffee', 'treat']);
  });
});

import { applyRulesAtCreate, addManualTag, removeTag, stripRuleApplications } from './tagging';
import prisma from '@/lib/prisma';
import * as provenance from './provenance';

vi.mock('@/lib/prisma', () => ({
  default: {
    transactions: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    categorization_rules: {
      findMany: vi.fn(),
    },
    provenance: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('./provenance', () => ({
  recordProvenance: vi.fn(),
  getProvenance: vi.fn(),
  findEntitiesBySource: vi.fn(),
  stripBySource: vi.fn(),
  demoteToManual: vi.fn(),
}));

describe('applyRulesAtCreate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates transaction tags + writes provenance for each new application', async () => {
    (prisma.transactions.findFirst as any).mockResolvedValue({
      id: 100, user_id: 1, tags: '', type: 'expense', name: 'Starbucks', amount: 5,
    });
    const rules: CompiledRule[] = [{
      id: 7, priority: 0,
      conditions: { type: 'condition', field: 'name', operator: 'contains', value: 'Starbucks' },
      actions: { addTags: ['coffee'] },
    }];

    await applyRulesAtCreate({ transactionId: 100, userId: 1, rules });

    expect(prisma.transactions.update).toHaveBeenCalledWith({
      where: { id: 100 },
      data: expect.objectContaining({ tags: 'coffee', type: 'expense' }),
    });
    expect(provenance.recordProvenance).toHaveBeenCalledWith(expect.objectContaining({
      userId: 1, entityType: 'transactions', entityId: 100,
      field: 'tags', value: 'coffee', sourceType: 'rule', sourceId: 7,
    }));
  });

  it('skips update when no rules match', async () => {
    (prisma.transactions.findFirst as any).mockResolvedValue({
      id: 100, user_id: 1, tags: '', type: 'expense', name: 'Random', amount: 5,
    });
    await applyRulesAtCreate({
      transactionId: 100, userId: 1,
      rules: [{ id: 1, priority: 0,
        conditions: { type: 'condition', field: 'name', operator: 'contains', value: 'Starbucks' },
        actions: { addTags: ['coffee'] },
      }],
    });
    expect(prisma.transactions.update).not.toHaveBeenCalled();
    expect(provenance.recordProvenance).not.toHaveBeenCalled();
  });

  it('writes a type-source provenance row when a rule sets type', async () => {
    (prisma.transactions.findFirst as any).mockResolvedValue({
      id: 100, user_id: 1, tags: '', type: 'expense', name: 'Salary', amount: 1000,
    });
    await applyRulesAtCreate({
      transactionId: 100, userId: 1,
      rules: [{ id: 3, priority: 0,
        conditions: { type: 'condition', field: 'name', operator: 'contains', value: 'Salary' },
        actions: { addTags: [], setType: 'income' },
      }],
    });
    expect(prisma.transactions.update).toHaveBeenCalledWith({
      where: { id: 100 },
      data: expect.objectContaining({ type: 'income' }),
    });
    expect(provenance.recordProvenance).toHaveBeenCalledWith(expect.objectContaining({
      field: 'type', value: null, sourceType: 'rule', sourceId: 3,
    }));
  });
});

describe('addManualTag', () => {
  beforeEach(() => vi.clearAllMocks());

  it('appends tag to transactions.tags + writes manual provenance row', async () => {
    (prisma.transactions.findFirst as any).mockResolvedValue({
      id: 1, user_id: 1, tags: 'foo,bar',
    });
    await addManualTag(1, 'baz', 1);
    expect(prisma.transactions.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { tags: 'foo,bar,baz' },
    });
    expect(provenance.recordProvenance).toHaveBeenCalledWith(expect.objectContaining({
      field: 'tags', value: 'baz', sourceType: 'manual',
    }));
  });

  it('is a no-op if tag already present', async () => {
    (prisma.transactions.findFirst as any).mockResolvedValue({
      id: 1, user_id: 1, tags: 'foo,bar',
    });
    await addManualTag(1, 'foo', 1);
    expect(prisma.transactions.update).not.toHaveBeenCalled();
    expect(provenance.recordProvenance).not.toHaveBeenCalled();
  });
});

describe('removeTag', () => {
  beforeEach(() => vi.clearAllMocks());

  it('removes tag from string and deletes provenance row', async () => {
    (prisma.transactions.findFirst as any).mockResolvedValue({
      id: 1, user_id: 1, tags: 'foo,bar,baz',
    });
    await removeTag(1, 'bar', 1);
    expect(prisma.transactions.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { tags: 'foo,baz' },
    });
    expect(prisma.provenance.deleteMany).toHaveBeenCalledWith({
      where: { entity_type: 'transactions', entity_id: 1, field: 'tags', value: 'bar' },
    });
  });
});

describe('stripRuleApplications', () => {
  beforeEach(() => vi.clearAllMocks());

  it('removes the rule\'s tags from each affected transaction and deletes provenance', async () => {
    (provenance.findEntitiesBySource as any).mockResolvedValue([
      { entity_type: 'transactions', entity_id: 1, field: 'tags', value: 'coffee' },
      { entity_type: 'transactions', entity_id: 1, field: 'tags', value: 'morning' },
      { entity_type: 'transactions', entity_id: 2, field: 'type', value: null },
    ]);
    (prisma.transactions.findFirst as any).mockImplementation(async ({ where }: any) => {
      if (where.id === 1) return { id: 1, user_id: 1, tags: 'coffee,morning,treat', type: 'expense' };
      if (where.id === 2) return { id: 2, user_id: 1, tags: 'salary', type: 'income' };
      return null;
    });

    await stripRuleApplications(7, 1);

    // Transaction 1: tags 'coffee' and 'morning' removed, 'treat' preserved
    expect(prisma.transactions.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ tags: 'treat' }),
    });
    // Transaction 2: type reset to 'expense' (default)
    expect(prisma.transactions.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: expect.objectContaining({ type: 'expense' }),
    });
    // All provenance for the rule is deleted
    expect(provenance.stripBySource).toHaveBeenCalledWith({ sourceType: 'rule', sourceId: 7 });
  });
});
