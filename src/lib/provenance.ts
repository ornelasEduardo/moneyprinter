import prisma from '@/lib/prisma';

export interface ProvenanceRecord {
  entity_type: string;
  entity_id: number;
  field: string;
  value: string | null;
  source_type: string;
  source_id: number | null;
}

export interface RecordProvenanceInput {
  userId: number;
  entityType: string;
  entityId: number;
  field: string;
  value?: string | null;
  sourceType: string;
  sourceId?: number | null;
}

export async function recordProvenance(input: RecordProvenanceInput): Promise<void> {
  await prisma.provenance.create({
    data: {
      user_id: input.userId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      field: input.field,
      value: input.value ?? null,
      source_type: input.sourceType,
      source_id: input.sourceId ?? null,
    },
  });
}

export async function getProvenance(q: {
  entityType: string;
  entityId: number;
  field?: string;
}): Promise<ProvenanceRecord[]> {
  const where: Record<string, unknown> = {
    entity_type: q.entityType,
    entity_id: q.entityId,
  };
  if (q.field) where.field = q.field;
  return prisma.provenance.findMany({ where }) as unknown as Promise<ProvenanceRecord[]>;
}

export async function findEntitiesBySource(q: {
  sourceType: string;
  sourceId: number;
}): Promise<ProvenanceRecord[]> {
  return prisma.provenance.findMany({
    where: { source_type: q.sourceType, source_id: q.sourceId },
  }) as unknown as Promise<ProvenanceRecord[]>;
}

export async function stripBySource(q: {
  sourceType: string;
  sourceId: number;
}): Promise<void> {
  await prisma.provenance.deleteMany({
    where: { source_type: q.sourceType, source_id: q.sourceId },
  });
}

export async function demoteToManual(q: {
  sourceType: string;
  sourceId: number;
}): Promise<void> {
  await prisma.provenance.updateMany({
    where: { source_type: q.sourceType, source_id: q.sourceId },
    data: { source_type: 'manual', source_id: null },
  });
}
