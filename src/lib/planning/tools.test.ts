import { describe, it, expect } from 'vitest';
import { PLAN_TOOLS, toolsByGroup } from './tools';

describe('plan tools catalog', () => {
  it('includes the mortgage tool under the Home group', () => {
    const mortgage = PLAN_TOOLS.find((t) => t.kind === 'mortgage');
    expect(mortgage).toBeDefined();
    expect(mortgage!.group).toBe('Home');
    expect(mortgage!.tab).toBe('mortgage');
    expect(mortgage!.description.length).toBeGreaterThan(0);
  });

  it('groups tools by life-area preserving first-seen order', () => {
    const groups = toolsByGroup();
    expect(groups.map((g) => g.group)).toEqual(['Home']);
    expect(groups[0].tools.map((t) => t.kind)).toContain('mortgage');
  });
});
