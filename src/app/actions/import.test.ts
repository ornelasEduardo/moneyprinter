import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateImport, commitImportAction } from './import';
import { requireAuth } from '@/lib/action-middleware';
import * as importLib from '@/lib/import';
import * as tagging from '@/lib/tagging';
import prisma from '@/lib/prisma';

vi.mock('@/lib/action-middleware', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    categorization_rules: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/import', () => ({
  parseCsvEntity: vi.fn().mockReturnValue([
    { name: 'Checking', type: 'checking', balance: '1500' },
  ]),
  validateRows: vi.fn().mockReturnValue({
    entity: 'accounts',
    total: 1,
    valid: [{ name: 'Checking', type: 'checking', balance: 1500 }],
    errors: [],
  }),
  detectConflicts: vi.fn().mockResolvedValue({
    entity: 'accounts',
    existingCount: 0,
    existingIds: [],
  }),
  commitImport: vi.fn().mockResolvedValue({
    created: 1,
    updated: 0,
    skipped: 0,
    insertedIds: [],
  }),
}));

vi.mock('@/lib/tagging', async (orig) => ({
  ...(await (orig as () => Promise<unknown>)() as object),
  applyRulesAtCreate: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('validateImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(1);
  });

  it('should validate CSV content and return results', async () => {
    const result = await validateImport('accounts', 'name,type,balance\nChecking,checking,1500');
    expect(result.validation.total).toBe(1);
    expect(result.validation.errors).toHaveLength(0);
    expect(result.conflicts.existingCount).toBe(0);
  });
});

describe('commitImportAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(1);
  });

  it('should commit import and return results', async () => {
    const result = await commitImportAction(
      'accounts',
      [{ name: 'Checking', type: 'checking', balance: 1500 }],
      'skip',
    );
    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
  });

  it('applies rules to each newly imported transaction', async () => {
    (importLib.commitImport as any).mockResolvedValue({
      created: 3,
      updated: 0,
      skipped: 0,
      insertedIds: [10, 11, 12],
    });
    (prisma.categorization_rules.findMany as any).mockResolvedValue([]);

    await commitImportAction(
      'transactions',
      [
        { name: 'A', amount: 1, date: '2026-01-01', account_id: 1 },
        { name: 'B', amount: 2, date: '2026-01-02', account_id: 1 },
        { name: 'C', amount: 3, date: '2026-01-03', account_id: 1 },
      ],
      'skip',
    );

    expect(tagging.applyRulesAtCreate).toHaveBeenCalledTimes(3);
    expect(tagging.applyRulesAtCreate).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: 10, userId: 1 }),
    );
    expect(tagging.applyRulesAtCreate).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: 11, userId: 1 }),
    );
    expect(tagging.applyRulesAtCreate).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: 12, userId: 1 }),
    );
  });

  it('does not apply rules for non-transaction imports', async () => {
    (importLib.commitImport as any).mockResolvedValue({
      created: 1,
      updated: 0,
      skipped: 0,
      insertedIds: [42],
    });

    await commitImportAction(
      'accounts',
      [{ name: 'Checking', type: 'checking', balance: 1500 }],
      'skip',
    );

    expect(tagging.applyRulesAtCreate).not.toHaveBeenCalled();
  });
});
