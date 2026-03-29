'use server';

import { requireAuth } from '@/lib/action-middleware';
import { exportEntity, exportEntityCsv, exportAllEntities, buildMetadata, EXPORTABLE_ENTITIES } from '@/lib/export';

export async function getExportData(entity: string, format: 'json' | 'csv' = 'json') {
  const userId = await requireAuth();

  if (format === 'csv') {
    return { csv: await exportEntityCsv(userId, entity) };
  }
  return { data: await exportEntity(userId, entity) };
}

export async function getFullExportData() {
  const userId = await requireAuth();
  const entityData = await exportAllEntities(userId);
  const metadata = buildMetadata('export', entityData);
  return { entityData, metadata };
}

export { EXPORTABLE_ENTITIES };
