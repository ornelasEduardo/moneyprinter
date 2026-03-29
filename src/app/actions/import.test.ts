import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateImport, commitImportAction } from './import';
import { requireAuth } from '@/lib/action-middleware';

vi.mock('@/lib/action-middleware', () => ({
  requireAuth: vi.fn(),
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
  }),
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
});
