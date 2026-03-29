import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportEntity, exportEntityCsv, EXPORTABLE_ENTITIES } from './export';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  default: {
    accounts: { findMany: vi.fn() },
    transactions: { findMany: vi.fn() },
    net_worth_history: { findMany: vi.fn() },
    income_sources: { findMany: vi.fn() },
    income_budgets: { findMany: vi.fn() },
    budget_limits: { findMany: vi.fn() },
    goals: { findMany: vi.fn() },
    user_settings: { findMany: vi.fn() },
  },
}));

const mockAccounts = [
  { id: 1, name: 'Checking', type: 'checking', balance: { toNumber: () => 1500.50 }, currency: 'USD', last_updated: new Date('2026-03-28'), plaid_id: null, user_id: 1, deleted_at: null },
  { id: 2, name: 'Savings', type: 'savings', balance: { toNumber: () => 5000 }, currency: 'USD', last_updated: new Date('2026-03-28'), plaid_id: null, user_id: 1, deleted_at: null },
];

describe('exportEntity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export accounts as JSON', async () => {
    (prisma.accounts.findMany as any).mockResolvedValue(mockAccounts);

    const result = await exportEntity(1, 'accounts');

    expect(prisma.accounts.findMany).toHaveBeenCalledWith({
      where: { user_id: 1, deleted_at: null },
    });
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Checking');
  });

  it('should exclude user_id and deleted_at from output', async () => {
    (prisma.accounts.findMany as any).mockResolvedValue(mockAccounts);

    const result = await exportEntity(1, 'accounts');

    expect(result[0]).not.toHaveProperty('user_id');
    expect(result[0]).not.toHaveProperty('deleted_at');
  });

  it('should convert Decimal objects to numbers', async () => {
    (prisma.accounts.findMany as any).mockResolvedValue(mockAccounts);

    const result = await exportEntity(1, 'accounts');

    expect(result[0].balance).toBe(1500.50);
  });

  it('should convert Date objects to ISO strings', async () => {
    (prisma.accounts.findMany as any).mockResolvedValue(mockAccounts);

    const result = await exportEntity(1, 'accounts');

    expect(typeof result[0].last_updated).toBe('string');
  });

  it('should throw for unknown entity', async () => {
    await expect(exportEntity(1, 'unknown')).rejects.toThrow('Unknown entity: unknown');
  });
});

describe('exportEntityCsv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export accounts as CSV string', async () => {
    (prisma.accounts.findMany as any).mockResolvedValue(mockAccounts);

    const csv = await exportEntityCsv(1, 'accounts');

    expect(csv).toContain('name');
    expect(csv).toContain('Checking');
    expect(csv).toContain('Savings');
  });
});

describe('EXPORTABLE_ENTITIES', () => {
  it('should include all financial entities', () => {
    expect(EXPORTABLE_ENTITIES).toContain('accounts');
    expect(EXPORTABLE_ENTITIES).toContain('transactions');
    expect(EXPORTABLE_ENTITIES).toContain('net_worth_history');
    expect(EXPORTABLE_ENTITIES).toContain('income_sources');
    expect(EXPORTABLE_ENTITIES).toContain('income_budgets');
    expect(EXPORTABLE_ENTITIES).toContain('budget_limits');
    expect(EXPORTABLE_ENTITIES).toContain('goals');
    expect(EXPORTABLE_ENTITIES).toContain('user_settings');
  });

  it('should NOT include system tables', () => {
    expect(EXPORTABLE_ENTITIES).not.toContain('users');
    expect(EXPORTABLE_ENTITIES).not.toContain('user_passwords');
    expect(EXPORTABLE_ENTITIES).not.toContain('audit_log');
  });
});
