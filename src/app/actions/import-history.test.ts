import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordImportHistory, getImportHistory, getImportErrors } from './import-history';
import { requireAuth } from '@/lib/action-middleware';
import prisma from '@/lib/prisma';

vi.mock('@/lib/action-middleware', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    import_history: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    import_errors: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe('recordImportHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(1);
  });

  it('should create history and errors records', async () => {
    (prisma.import_history.create as any).mockResolvedValue({ id: 10 });

    await recordImportHistory({
      configurationId: 1,
      batchId: 'abc-123',
      filename: 'chase.csv',
      status: 'completed',
      summary: { total_rows: 100, imported: 95 },
      errors: [
        { row_number: 5, field: 'amount', message: 'Invalid', severity: 'error', raw_value: 'abc' },
      ],
    });

    expect(prisma.import_history.create).toHaveBeenCalledWith({
      data: {
        user_id: 1,
        configuration_id: 1,
        batch_id: 'abc-123',
        filename: 'chase.csv',
        status: 'completed',
        summary: { total_rows: 100, imported: 95 },
      },
    });
    expect(prisma.import_errors.createMany).toHaveBeenCalledWith({
      data: [{ import_id: 10, row_number: 5, field: 'amount', message: 'Invalid', severity: 'error', raw_value: 'abc' }],
    });
  });
});

describe('getImportHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(1);
  });

  it('should return history for user', async () => {
    const mockHistory = [{ id: 1, filename: 'test.csv' }];
    (prisma.import_history.findMany as any).mockResolvedValue(mockHistory);

    const result = await getImportHistory();

    expect(prisma.import_history.findMany).toHaveBeenCalledWith({
      where: { user_id: 1 },
      orderBy: { created_at: 'desc' },
      take: 50,
      include: { configuration: { select: { name: true } } },
    });
    expect(result).toEqual(mockHistory);
  });
});

describe('getImportErrors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(1);
  });

  it('should return paginated errors for an import', async () => {
    const mockErrors = [{ id: 1, message: 'bad value' }];
    (prisma.import_errors.findMany as any).mockResolvedValue(mockErrors);

    const result = await getImportErrors(10, 0, 20);

    expect(prisma.import_errors.findMany).toHaveBeenCalledWith({
      where: { import_id: 10 },
      orderBy: { row_number: 'asc' },
      skip: 0,
      take: 20,
    });
    expect(result).toEqual(mockErrors);
  });
});
