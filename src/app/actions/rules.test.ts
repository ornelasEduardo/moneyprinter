import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createRule,
  updateRule,
  deleteRule,
  listRules,
  applyRuleToHistory,
  previewRuleAgainstHistory,
} from './rules';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/action-middleware';
import * as tagging from '@/lib/tagging';
import * as provenance from '@/lib/provenance';

vi.mock('@/lib/prisma', () => ({
  default: {
    categorization_rules: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    transactions: {
      findMany: vi.fn(),
    },
  },
}));
vi.mock('@/lib/action-middleware', () => ({ requireAuth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/tagging', () => ({
  applyRulesAtCreate: vi.fn(),
  stripRuleApplications: vi.fn(),
}));
vi.mock('@/lib/provenance', () => ({
  demoteToManual: vi.fn(),
}));

const mockUserId = 9;
const baseFD = (over: Record<string, string> = {}) => {
  const f = new FormData();
  f.append('name', 'Coffee Shops');
  f.append('enabled', 'true');
  f.append('priority', '0');
  f.append('conditions', JSON.stringify({
    type: 'condition', field: 'name', operator: 'contains', value: 'Starbucks',
  }));
  f.append('actions', JSON.stringify({ addTags: ['coffee'] }));
  for (const [k, v] of Object.entries(over)) f.set(k, v);
  return f;
};

describe('rule actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(mockUserId);
  });

  describe('createRule', () => {
    it('creates a rule with parsed conditions and actions', async () => {
      (prisma.categorization_rules.create as any).mockResolvedValue({ id: 1 });
      await createRule(baseFD());
      expect(prisma.categorization_rules.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user_id: mockUserId,
          name: 'Coffee Shops',
          enabled: true,
          priority: 0,
          conditions: expect.objectContaining({ type: 'condition', field: 'name' }),
          actions: { addTags: ['coffee'] },
        }),
      });
    });

    it('rejects when name is missing', async () => {
      await expect(createRule(baseFD({ name: '' }))).rejects.toThrow(/name/i);
    });

    it('rejects when conditions JSON is malformed', async () => {
      const fd = baseFD();
      fd.set('conditions', 'not-json');
      await expect(createRule(fd)).rejects.toThrow(/conditions/i);
    });

    it('rejects when conditions has an unknown operator', async () => {
      const fd = baseFD();
      fd.set('conditions', JSON.stringify({
        type: 'condition', field: 'name', operator: 'matches_regex', value: 'x',
      }));
      await expect(createRule(fd)).rejects.toThrow();
    });
  });

  describe('updateRule', () => {
    it('updates ownership-checked rule', async () => {
      (prisma.categorization_rules.findFirst as any).mockResolvedValue({ id: 5, user_id: mockUserId });
      (prisma.categorization_rules.update as any).mockResolvedValue({ id: 5 });
      await updateRule(5, baseFD({ name: 'Renamed' }));
      expect(prisma.categorization_rules.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: expect.objectContaining({ name: 'Renamed' }),
      });
    });

    it('rejects when rule does not belong to user', async () => {
      (prisma.categorization_rules.findFirst as any).mockResolvedValue(null);
      await expect(updateRule(5, baseFD())).rejects.toThrow(/not found|unauthorized/i);
    });
  });

  describe('deleteRule', () => {
    it('default: soft-deletes rule and demotes provenance to manual', async () => {
      (prisma.categorization_rules.deleteMany as any).mockResolvedValue({ count: 1 });
      await deleteRule(5, { stripApplications: false });
      expect(prisma.categorization_rules.deleteMany).toHaveBeenCalledWith({
        where: { id: 5, user_id: mockUserId },
      });
      expect(provenance.demoteToManual).toHaveBeenCalledWith({ sourceType: 'rule', sourceId: 5 });
      expect(tagging.stripRuleApplications).not.toHaveBeenCalled();
    });

    it('strip option: calls stripRuleApplications', async () => {
      (prisma.categorization_rules.deleteMany as any).mockResolvedValue({ count: 1 });
      await deleteRule(5, { stripApplications: true });
      expect(tagging.stripRuleApplications).toHaveBeenCalledWith(5, mockUserId);
      expect(provenance.demoteToManual).not.toHaveBeenCalled();
    });

    it('rejects when nothing was deleted', async () => {
      (prisma.categorization_rules.deleteMany as any).mockResolvedValue({ count: 0 });
      await expect(deleteRule(5, { stripApplications: false })).rejects.toThrow(/not found|unauthorized/i);
    });
  });

  describe('listRules', () => {
    it('returns user rules sorted by priority desc, enabled first', async () => {
      const rules = [
        { id: 1, priority: 10, enabled: true },
        { id: 2, priority: 5, enabled: false },
      ];
      (prisma.categorization_rules.findMany as any).mockResolvedValue(rules);
      const result = await listRules();
      expect(prisma.categorization_rules.findMany).toHaveBeenCalledWith({
        where: { user_id: mockUserId, deleted_at: null },
        orderBy: [{ enabled: 'desc' }, { priority: 'desc' }],
      });
      expect(result).toEqual(rules);
    });
  });

  describe('previewRuleAgainstHistory', () => {
    it('returns matching transactions', async () => {
      (prisma.categorization_rules.findFirst as any).mockResolvedValue({
        id: 7, user_id: mockUserId,
        conditions: { type: 'condition', field: 'name', operator: 'contains', value: 'Starbucks' },
        actions: { addTags: ['coffee'] },
        priority: 0,
      });
      (prisma.transactions.findMany as any).mockResolvedValue([
        { id: 1, name: 'Starbucks #123', amount: 5, type: 'expense' },
        { id: 2, name: 'Trader Joes', amount: 30, type: 'expense' },
      ]);
      const result = await previewRuleAgainstHistory(7);
      expect(result.matches.map((t: any) => t.id)).toEqual([1]);
    });
  });

  describe('applyRuleToHistory', () => {
    it('calls applyRulesAtCreate for each matching transaction', async () => {
      (prisma.categorization_rules.findFirst as any).mockResolvedValue({
        id: 7, user_id: mockUserId, priority: 0,
        conditions: { type: 'condition', field: 'name', operator: 'contains', value: 'Star' },
        actions: { addTags: ['coffee'] },
      });
      (prisma.transactions.findMany as any).mockResolvedValue([
        { id: 1, name: 'Starbucks', amount: 5, type: 'expense' },
        { id: 2, name: 'Stardust Cafe', amount: 8, type: 'expense' },
      ]);
      const result = await applyRuleToHistory(7);
      expect(result.applied).toBe(2);
      expect(tagging.applyRulesAtCreate).toHaveBeenCalledTimes(2);
    });
  });
});
