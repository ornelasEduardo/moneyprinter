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
