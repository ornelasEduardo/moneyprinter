import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  recordProvenance,
  getProvenance,
  findEntitiesBySource,
  stripBySource,
  demoteToManual,
} from './provenance';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  default: {
    provenance: {
      create: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

describe('provenance service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('recordProvenance writes a row with the supplied fields', async () => {
    await recordProvenance({
      userId: 1,
      entityType: 'transactions',
      entityId: 42,
      field: 'tags',
      value: 'coffee',
      sourceType: 'rule',
      sourceId: 5,
    });
    expect(prisma.provenance.create).toHaveBeenCalledWith({
      data: {
        user_id: 1,
        entity_type: 'transactions',
        entity_id: 42,
        field: 'tags',
        value: 'coffee',
        source_type: 'rule',
        source_id: 5,
      },
    });
  });

  it('recordProvenance handles null value and null sourceId', async () => {
    await recordProvenance({
      userId: 1,
      entityType: 'transactions',
      entityId: 42,
      field: 'type',
      sourceType: 'manual',
    });
    expect(prisma.provenance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        field: 'type',
        value: null,
        source_type: 'manual',
        source_id: null,
      }),
    });
  });

  it('getProvenance queries by entity, optionally filtered by field', async () => {
    (prisma.provenance.findMany as any).mockResolvedValue([]);
    await getProvenance({ entityType: 'transactions', entityId: 42, field: 'tags' });
    expect(prisma.provenance.findMany).toHaveBeenCalledWith({
      where: { entity_type: 'transactions', entity_id: 42, field: 'tags' },
    });
  });

  it('findEntitiesBySource queries by source_type + source_id', async () => {
    (prisma.provenance.findMany as any).mockResolvedValue([
      { entity_type: 'transactions', entity_id: 1, field: 'tags', value: 'coffee' },
    ]);
    const result = await findEntitiesBySource({ sourceType: 'rule', sourceId: 7 });
    expect(prisma.provenance.findMany).toHaveBeenCalledWith({
      where: { source_type: 'rule', source_id: 7 },
    });
    expect(result).toHaveLength(1);
  });

  it('stripBySource deletes all rows for the source', async () => {
    (prisma.provenance.deleteMany as any).mockResolvedValue({ count: 3 });
    await stripBySource({ sourceType: 'rule', sourceId: 7 });
    expect(prisma.provenance.deleteMany).toHaveBeenCalledWith({
      where: { source_type: 'rule', source_id: 7 },
    });
  });

  it('demoteToManual updates source_type to manual and clears source_id', async () => {
    (prisma.provenance.updateMany as any).mockResolvedValue({ count: 3 });
    await demoteToManual({ sourceType: 'rule', sourceId: 7 });
    expect(prisma.provenance.updateMany).toHaveBeenCalledWith({
      where: { source_type: 'rule', source_id: 7 },
      data: { source_type: 'manual', source_id: null },
    });
  });
});
