'use server';

import { requireAuth } from '@/lib/action-middleware';
import prisma from '@/lib/prisma';

export async function recordImportHistory(params: {
  configurationId?: number | null;
  batchId?: string;
  filename: string;
  status: 'completed' | 'partial' | 'failed';
  summary: Record<string, unknown>;
  errors: {
    row_number: number;
    field?: string;
    message: string;
    severity: 'error' | 'warning';
    raw_value?: string;
  }[];
}) {
  const userId = await requireAuth();

  const history = await prisma.import_history.create({
    data: {
      user_id: userId,
      configuration_id: params.configurationId ?? null,
      batch_id: params.batchId,
      filename: params.filename,
      status: params.status,
      summary: params.summary,
    },
  });

  if (params.errors.length > 0) {
    await prisma.import_errors.createMany({
      data: params.errors.map((e) => ({
        import_id: history.id,
        row_number: e.row_number,
        field: e.field,
        message: e.message,
        severity: e.severity,
        raw_value: e.raw_value,
      })),
    });
  }

  return history;
}

export async function getImportHistory() {
  const userId = await requireAuth();
  return prisma.import_history.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    take: 50,
    include: {
      configuration: { select: { name: true } },
    },
  });
}

export async function getImportErrors(importId: number, offset = 0, limit = 20) {
  await requireAuth();
  return prisma.import_errors.findMany({
    where: { import_id: importId },
    orderBy: { row_number: 'asc' },
    skip: offset,
    take: limit,
  });
}
