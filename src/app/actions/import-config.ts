'use server';

import { requireAuth } from '@/lib/action-middleware';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getImportConfigurations() {
  const userId = await requireAuth();
  return prisma.import_configurations.findMany({
    where: { user_id: userId },
    orderBy: { updated_at: 'desc' },
  });
}

export async function createImportConfiguration(config: {
  name: string;
  column_mapping: Record<string, unknown>;
  behaviors: Record<string, unknown>;
}) {
  const userId = await requireAuth();
  const result = await prisma.import_configurations.create({
    data: {
      user_id: userId,
      name: config.name,
      column_mapping: config.column_mapping,
      behaviors: config.behaviors,
    },
  });
  revalidatePath('/');
  return result;
}

export async function updateImportConfiguration(
  id: number,
  config: {
    name?: string;
    column_mapping?: Record<string, unknown>;
    behaviors?: Record<string, unknown>;
  },
) {
  const userId = await requireAuth();
  await prisma.import_configurations.updateMany({
    where: { id, user_id: userId },
    data: {
      ...config,
      updated_at: new Date(),
    },
  });
  revalidatePath('/');
}

export async function deleteImportConfiguration(id: number) {
  const userId = await requireAuth();
  await prisma.import_configurations.deleteMany({
    where: { id, user_id: userId },
  });
  revalidatePath('/');
}
