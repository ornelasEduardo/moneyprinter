import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRecentAuditLog, undoEntry, undoEntryBatch } from './audit';
import { getAuditLog, undoAuditEntry, undoBatch } from '@/lib/audit';
import { requireAuth } from '@/lib/action-middleware';

vi.mock('@/lib/audit', () => ({
  getAuditLog: vi.fn(),
  undoAuditEntry: vi.fn(),
  undoBatch: vi.fn(),
}));

vi.mock('@/lib/action-middleware', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('getRecentAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(1);
  });

  it('should return audit entries with default params', async () => {
    const mockEntries = [{ id: 1, action: 'CREATE' }];
    (getAuditLog as any).mockResolvedValue(mockEntries);

    const result = await getRecentAuditLog();

    expect(getAuditLog).toHaveBeenCalledWith({ limit: 50, offset: 0 });
    expect(result).toEqual(mockEntries);
  });

  it('should pass through filter params', async () => {
    (getAuditLog as any).mockResolvedValue([]);

    await getRecentAuditLog({ entityType: 'accounts', limit: 10, offset: 5 });

    expect(getAuditLog).toHaveBeenCalledWith({ entityType: 'accounts', limit: 10, offset: 5 });
  });
});

describe('undoEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(1);
  });

  it('should call undoAuditEntry with the given id', async () => {
    await undoEntry(5);

    expect(undoAuditEntry).toHaveBeenCalledWith(5);
  });
});

describe('undoEntryBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(1);
  });

  it('should call undoBatch with the given batchId', async () => {
    const batchId = '550e8400-e29b-41d4-a716-446655440000';

    await undoEntryBatch(batchId);

    expect(undoBatch).toHaveBeenCalledWith(batchId);
  });
});
