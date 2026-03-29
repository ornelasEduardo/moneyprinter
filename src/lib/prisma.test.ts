import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the exported helper functions that drive the extension logic.
// The actual $extends integration is tested via action-level tests.

vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock('@/lib/audit-context', () => ({
  auditStore: {
    getStore: vi.fn(),
  },
}));

import { shouldAudit, UNAUDITED_MODELS } from './prisma';

describe('shouldAudit', () => {
  it('should return true for audited models with mutating operations', () => {
    expect(shouldAudit('accounts', 'create')).toBe(true);
    expect(shouldAudit('accounts', 'update')).toBe(true);
    expect(shouldAudit('accounts', 'delete')).toBe(true);
    expect(shouldAudit('transactions', 'updateMany')).toBe(true);
    expect(shouldAudit('net_worth_history', 'deleteMany')).toBe(true);
    expect(shouldAudit('income_sources', 'create')).toBe(true);
  });

  it('should return false for unaudited models', () => {
    expect(shouldAudit('users', 'update')).toBe(false);
    expect(shouldAudit('user_passwords', 'update')).toBe(false);
    expect(shouldAudit('user_settings', 'create')).toBe(false);
    expect(shouldAudit('audit_log', 'create')).toBe(false);
  });

  it('should return false for read operations', () => {
    expect(shouldAudit('accounts', 'findMany')).toBe(false);
    expect(shouldAudit('accounts', 'findUnique')).toBe(false);
    expect(shouldAudit('accounts', 'findFirst')).toBe(false);
    expect(shouldAudit('accounts', 'aggregate')).toBe(false);
    expect(shouldAudit('accounts', 'count')).toBe(false);
  });

  it('should return false when model is undefined', () => {
    expect(shouldAudit(undefined, 'create')).toBe(false);
  });
});

describe('UNAUDITED_MODELS', () => {
  it('should contain auth and system tables', () => {
    expect(UNAUDITED_MODELS).toContain('users');
    expect(UNAUDITED_MODELS).toContain('user_passwords');
    expect(UNAUDITED_MODELS).toContain('user_settings');
    expect(UNAUDITED_MODELS).toContain('audit_log');
  });

  it('should NOT contain financial data tables', () => {
    expect(UNAUDITED_MODELS).not.toContain('accounts');
    expect(UNAUDITED_MODELS).not.toContain('transactions');
    expect(UNAUDITED_MODELS).not.toContain('net_worth_history');
    expect(UNAUDITED_MODELS).not.toContain('income_sources');
  });
});
