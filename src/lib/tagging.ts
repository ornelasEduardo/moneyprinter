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
