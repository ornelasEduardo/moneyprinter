import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeAuditLog, getAuditLog, undoAuditEntry, undoBatch } from './audit';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  default: {
    audit_log: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    accounts: {
      update: vi.fn(),
    },
    transactions: {
      update: vi.fn(),
    },
    net_worth_history: {
      update: vi.fn(),
    },
    income_sources: {
      update: vi.fn(),
    },
    $transaction: vi.fn((fn: any) => fn(prisma)),
  },
}));

describe('writeAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an audit entry with all fields', async () => {
    await writeAuditLog({
      userId: 1,
      entityType: 'accounts',
      entityId: 10,
      action: 'UPDATE',
      previousValue: { balance: 100 },
      newValue: { balance: 200 },
      batchId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(prisma.audit_log.create).toHaveBeenCalledWith({
      data: {
        user_id: 1,
        entity_type: 'accounts',
        entity_id: 10,
        action: 'UPDATE',
        previous_value: { balance: 100 },
        new_value: { balance: 200 },
        batch_id: '550e8400-e29b-41d4-a716-446655440000',
      },
    });
  });

  it('should create an audit entry without optional fields', async () => {
    await writeAuditLog({
      userId: 1,
      entityType: 'accounts',
      entityId: 10,
      action: 'CREATE',
      newValue: { name: 'Savings' },
    });

    expect(prisma.audit_log.create).toHaveBeenCalledWith({
      data: {
        user_id: 1,
        entity_type: 'accounts',
        entity_id: 10,
        action: 'CREATE',
        previous_value: undefined,
        new_value: { name: 'Savings' },
        batch_id: undefined,
      },
    });
  });
});

describe('getAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return audit entries with default limit', async () => {
    const mockEntries = [
      { id: 1, entity_type: 'accounts', entity_id: 10, action: 'UPDATE', created_at: new Date() },
    ];
    (prisma.audit_log.findMany as any).mockResolvedValue(mockEntries);

    const result = await getAuditLog({});

    expect(prisma.audit_log.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { created_at: 'desc' },
      take: 50,
      skip: 0,
    });
    expect(result).toEqual(mockEntries);
  });

  it('should filter by entityType and entityId', async () => {
    (prisma.audit_log.findMany as any).mockResolvedValue([]);

    await getAuditLog({ entityType: 'accounts', entityId: 5, limit: 10, offset: 20 });

    expect(prisma.audit_log.findMany).toHaveBeenCalledWith({
      where: { entity_type: 'accounts', entity_id: 5 },
      orderBy: { created_at: 'desc' },
      take: 10,
      skip: 20,
    });
  });
});

describe('undoAuditEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should restore previous_value for an UPDATE entry', async () => {
    (prisma.audit_log.findUnique as any).mockResolvedValue({
      id: 1,
      user_id: 1,
      entity_type: 'accounts',
      entity_id: 10,
      action: 'UPDATE',
      previous_value: { name: 'Old Name', balance: 100 },
      new_value: { name: 'New Name', balance: 200 },
    });

    await undoAuditEntry(1);

    expect(prisma.accounts.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { name: 'Old Name', balance: 100 },
    });
    // Should write a compensating audit entry
    expect(prisma.audit_log.create).toHaveBeenCalled();
  });

  it('should set deleted_at for a CREATE entry (undo creation = soft delete)', async () => {
    (prisma.audit_log.findUnique as any).mockResolvedValue({
      id: 2,
      user_id: 1,
      entity_type: 'accounts',
      entity_id: 10,
      action: 'CREATE',
      previous_value: null,
      new_value: { name: 'New Account' },
    });

    await undoAuditEntry(2);

    expect(prisma.accounts.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { deleted_at: expect.any(Date) },
    });
  });

  it('should clear deleted_at for a DELETE entry (undo deletion = restore)', async () => {
    (prisma.audit_log.findUnique as any).mockResolvedValue({
      id: 3,
      user_id: 1,
      entity_type: 'accounts',
      entity_id: 10,
      action: 'DELETE',
      previous_value: { name: 'Deleted Account' },
      new_value: null,
    });

    await undoAuditEntry(3);

    expect(prisma.accounts.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { deleted_at: null },
    });
  });

  it('should throw if audit entry not found', async () => {
    (prisma.audit_log.findUnique as any).mockResolvedValue(null);

    await expect(undoAuditEntry(999)).rejects.toThrow('Audit entry not found');
  });
});

describe('undoBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should undo all entries in a batch in reverse chronological order', async () => {
    const batchId = '550e8400-e29b-41d4-a716-446655440000';
    const entries = [
      { id: 3, user_id: 1, entity_type: 'accounts', entity_id: 10, action: 'UPDATE', previous_value: { balance: 100 }, new_value: { balance: 200 }, created_at: new Date('2026-03-28T03:00:00Z') },
      { id: 2, user_id: 1, entity_type: 'accounts', entity_id: 11, action: 'UPDATE', previous_value: { balance: 300 }, new_value: { balance: 400 }, created_at: new Date('2026-03-28T02:00:00Z') },
      { id: 1, user_id: 1, entity_type: 'accounts', entity_id: 12, action: 'CREATE', previous_value: null, new_value: { name: 'New' }, created_at: new Date('2026-03-28T01:00:00Z') },
    ];
    (prisma.audit_log.findMany as any).mockResolvedValue(entries);

    await undoBatch(batchId);

    expect(prisma.audit_log.findMany).toHaveBeenCalledWith({
      where: { batch_id: batchId },
      orderBy: { created_at: 'desc' },
    });
  });
});
