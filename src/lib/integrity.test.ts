import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runIntegrityChecks } from './integrity';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  default: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn().mockResolvedValue(1),
}));

describe('runIntegrityChecks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when no issues found', async () => {
    (prisma.$queryRaw as any).mockResolvedValue([]);

    const warnings = await runIntegrityChecks();

    expect(warnings).toEqual([]);
  });

  it('should detect orphaned transactions', async () => {
    (prisma.$queryRaw as any)
      .mockResolvedValueOnce([{ id: 5, account_id: 999 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const warnings = await runIntegrityChecks();

    expect(warnings).toContainEqual(
      expect.objectContaining({
        type: 'orphaned_transaction',
        entityType: 'transactions',
        entityId: 5,
      })
    );
  });

  it('should detect orphaned income budgets', async () => {
    (prisma.$queryRaw as any)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 10, income_source_id: 888 }])
      .mockResolvedValueOnce([]);

    const warnings = await runIntegrityChecks();

    expect(warnings).toContainEqual(
      expect.objectContaining({
        type: 'orphaned_budget',
        entityType: 'income_budgets',
        entityId: 10,
      })
    );
  });

  it('should detect duplicate net worth entries', async () => {
    (prisma.$queryRaw as any)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ date: '2026-03-28', count: 2 }]);

    const warnings = await runIntegrityChecks();

    expect(warnings).toContainEqual(
      expect.objectContaining({
        type: 'duplicate_entry',
        entityType: 'net_worth_history',
      })
    );
  });
});
