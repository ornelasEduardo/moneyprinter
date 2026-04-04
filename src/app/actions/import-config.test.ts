import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getImportConfigurations,
  createImportConfiguration,
  updateImportConfiguration,
  deleteImportConfiguration,
} from './import-config';
import { requireAuth } from '@/lib/action-middleware';
import prisma from '@/lib/prisma';

vi.mock('@/lib/action-middleware', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    import_configurations: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('getImportConfigurations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(1);
  });

  it('should return all configurations for the user', async () => {
    const mockConfigs = [
      { id: 1, name: 'Chase Checking', column_mapping: {}, behaviors: {} },
    ];
    (prisma.import_configurations.findMany as any).mockResolvedValue(mockConfigs);

    const result = await getImportConfigurations();

    expect(prisma.import_configurations.findMany).toHaveBeenCalledWith({
      where: { user_id: 1 },
      orderBy: { updated_at: 'desc' },
    });
    expect(result).toEqual(mockConfigs);
  });
});

describe('createImportConfiguration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(1);
  });

  it('should create a configuration', async () => {
    const config = {
      name: 'Chase Checking',
      column_mapping: { Date: { field: 'date', type: 'date' } },
      behaviors: { date_format: 'MM/DD/YYYY' },
    };
    (prisma.import_configurations.create as any).mockResolvedValue({ id: 1, ...config });

    const result = await createImportConfiguration(config);

    expect(prisma.import_configurations.create).toHaveBeenCalledWith({
      data: {
        user_id: 1,
        name: 'Chase Checking',
        column_mapping: config.column_mapping,
        behaviors: config.behaviors,
      },
    });
    expect(result.id).toBe(1);
  });
});

describe('deleteImportConfiguration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue(1);
  });

  it('should delete a configuration owned by user', async () => {
    (prisma.import_configurations.deleteMany as any).mockResolvedValue({ count: 1 });

    await deleteImportConfiguration(5);

    expect(prisma.import_configurations.deleteMany).toHaveBeenCalledWith({
      where: { id: 5, user_id: 1 },
    });
  });
});
