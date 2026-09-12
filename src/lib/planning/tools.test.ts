import { describe, it, expect } from 'vitest';
import { PLAN_TOOLS, toolsByGroup, tabForKind, labelForKind, amountLabelForKind } from './tools';

describe('plan tools catalog', () => {
  it('includes the mortgage tool under the Housing group', () => {
    const mortgage = PLAN_TOOLS.find((t) => t.kind === 'mortgage');
    expect(mortgage).toBeDefined();
    expect(mortgage!.group).toBe('Housing');
    expect(mortgage!.tab).toBe('mortgage');
    expect(mortgage!.description.length).toBeGreaterThan(0);
  });

  it('groups tools by life-area preserving first-seen order', () => {
    const groups = toolsByGroup();
    expect(groups.map((g) => g.group)).toEqual(['Housing']);
    expect(groups[0].tools.map((t) => t.kind)).toContain('mortgage');
  });

  it('resolves route, label, and amount-label from the registry by kind', () => {
    expect(tabForKind('mortgage')).toBe('mortgage');
    expect(labelForKind('mortgage')).toBe('Mortgage');
    expect(amountLabelForKind('mortgage')).toBe('Down payment');
  });

  it('falls back sanely for an unknown kind', () => {
    expect(tabForKind('unknown')).toBe('unknown');
    expect(amountLabelForKind('unknown')).toBe('Target');
  });
});
