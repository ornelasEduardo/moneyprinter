import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeAuditLog, getAuditLog, undoAuditEntry, undoBatch } from './audit';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  default: {
    audit_log: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    accounts: {
      update: vi.fn(),
    },
    transactions: {
      update: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    transfers: { update: vi.fn() },
    net_worth_history: {
      update: vi.fn(),
    },
    income_sources: {
      update: vi.fn(),
    },
    $transaction: vi.fn((fn: any) => fn(prisma)),
  },
}));

describe('historical undo after payment matching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.transactions.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.transactions.count).mockResolvedValue(0);
  });

  it('rejects undoing an old statement creation after it has been reconciled', async () => {
    vi.mocked(prisma.audit_log.findUnique).mockResolvedValue({ id: 100, user_id: 7, entity_type: 'transactions', entity_id: 1, action: 'CREATE', new_value: { type: 'payment_out' }, undone_at: null } as never);
    vi.mocked(prisma.transactions.findFirst).mockResolvedValue({ id: 1, transfer_id: 20 } as never);
    await expect(undoAuditEntry(100)).rejects.toThrow(/unlink/i);
    expect(prisma.transactions.update).not.toHaveBeenCalled();
  });

  it('rejects undoing an old transfer edit when statement entries now link to it', async () => {
    vi.mocked(prisma.audit_log.findUnique).mockResolvedValue({ id: 101, user_id: 7, entity_type: 'transfers', entity_id: 20, action: 'UPDATE', previous_value: { amount: 99 }, undone_at: null } as never);
    vi.mocked(prisma.transactions.count).mockResolvedValue(1);
    await expect(undoAuditEntry(101)).rejects.toThrow(/unlink/i);
    expect(prisma.transfers.update).not.toHaveBeenCalled();
  });

  it('checks all current links before starting any batch undo', async () => {
    vi.mocked(prisma.audit_log.findMany).mockResolvedValue([
      { id: 102, user_id: 7, entity_type: 'accounts', entity_id: 10, action: 'CREATE' },
      { id: 103, user_id: 7, entity_type: 'transactions', entity_id: 1, action: 'CREATE' },
    ] as never);
    vi.mocked(prisma.transactions.findFirst).mockResolvedValue({ id: 1, transfer_id: 20 } as never);
    await expect(undoBatch('550e8400-e29b-41d4-a716-446655440000')).rejects.toThrow(/unlink/i);
    expect(prisma.accounts.update).not.toHaveBeenCalled();
    expect(prisma.transactions.update).not.toHaveBeenCalled();
  });
});

describe('relational operation undo safety', () => {
  it('does not undo a single reconciliation write and strand its other side', async () => {
    vi.mocked(prisma.audit_log.findUnique).mockResolvedValue({ id: 91, action: 'UPDATE', entity_type: 'transactions', entity_id: 1, new_value: { payment_reconciliation: true }, undone_at: null } as never);
    await expect(undoAuditEntry(91)).rejects.toThrow(/unlink/i);
  });
  it('does not partially undo a restore batch', async () => {
    vi.mocked(prisma.audit_log.findMany).mockResolvedValue([{ id: 92, batch_id: 'restore:abc', action: 'CREATE', entity_type: 'accounts', entity_id: 1 }] as never);
    await expect(undoBatch('restore:abc')).rejects.toThrow(/restore/i);
  });
});

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

  it('should throw if audit entry already undone', async () => {
    (prisma.audit_log.findUnique as any).mockResolvedValue({
      id: 4,
      user_id: 1,
      entity_type: 'accounts',
      entity_id: 10,
      action: 'UPDATE',
      previous_value: { balance: 100 },
      new_value: { balance: 200 },
      undone_at: new Date(),
    });

    await expect(undoAuditEntry(4)).rejects.toThrow('Audit entry already undone');
  });

  it('should mark entry as undone after undo', async () => {
    (prisma.audit_log.findUnique as any).mockResolvedValue({
      id: 1,
      user_id: 1,
      entity_type: 'accounts',
      entity_id: 10,
      action: 'UPDATE',
      previous_value: { balance: 100 },
      new_value: { balance: 200 },
      undone_at: null,
    });

    await undoAuditEntry(1);

    expect(prisma.audit_log.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { undone_at: expect.any(Date) },
    });
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
