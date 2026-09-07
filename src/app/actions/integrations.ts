'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/action-middleware';
import { BEA_COL } from '@/lib/integrations/registry';

export const colConfigSchema = z
  .object({
    mode: z.enum(['manual', 'bea']),
    tier: z.enum(['standard', 'high', 'veryHigh', 'extreme']).optional(),
    front: z.number().min(0.1).max(0.6).optional(),
    back: z.number().min(0.1).max(0.6).optional(),
    region: z.string().max(20).optional(),
    beaEnabled: z.boolean().optional(),
    beaKey: z.string().min(1).max(128).optional(),
  })
  .refine((v) => (v.front === undefined) === (v.back === undefined), {
    message: 'front and back custom caps must be set together',
    path: ['back'],
  })
  .refine((v) => v.front === undefined || v.back === undefined || v.front <= v.back, {
    message: 'front cap must be <= back cap',
    path: ['front'],
  });

export interface ColConfigView {
  mode: 'manual' | 'bea';
  tier?: string;
  front?: number;
  back?: number;
  region?: string;
  beaEnabled: boolean;
  hasBeaKey: boolean;
}

export interface IntegrationAuditRow {
  id: number;
  integration_id: string;
  host: string;
  purpose: string;
  created_at: Date;
}

async function readSetting(userId: number, key: string): Promise<string | undefined> {
  const row = await prisma.user_settings.findUnique({ where: { user_id_key: { user_id: userId, key } } });
  return row?.value ?? undefined;
}

async function writeSetting(userId: number, key: string, value: string): Promise<void> {
  await prisma.user_settings.upsert({
    where: { user_id_key: { user_id: userId, key } },
    update: { value },
    create: { user_id: userId, key, value },
  });
}

export async function getPlanningColConfig(): Promise<ColConfigView> {
  const userId = await requireAuth();
  const [mode, tier, front, back, region, enabled, key] = await Promise.all([
    readSetting(userId, 'col_mode'),
    readSetting(userId, 'col_tier'),
    readSetting(userId, 'col_front'),
    readSetting(userId, 'col_back'),
    readSetting(userId, 'home_region'),
    readSetting(userId, BEA_COL.enabledKey),
    readSetting(userId, BEA_COL.credentialKey!),
  ]);
  return {
    mode: mode === 'bea' ? 'bea' : 'manual',
    tier,
    front: front !== undefined ? Number(front) : undefined,
    back: back !== undefined ? Number(back) : undefined,
    region,
    beaEnabled: enabled === 'true',
    hasBeaKey: key !== undefined && key.length > 0,
  };
}

export async function savePlanningColConfig(input: unknown): Promise<void> {
  const userId = await requireAuth();
  const cfg = colConfigSchema.parse(input);

  // Enabling BEA requires a key — provided now or already stored.
  if (cfg.beaEnabled) {
    const stored = await readSetting(userId, BEA_COL.credentialKey!);
    if (!cfg.beaKey && !stored) throw new Error('Enabling the BEA integration requires an API key');
  }

  await writeSetting(userId, 'col_mode', cfg.mode);
  if (cfg.tier !== undefined) await writeSetting(userId, 'col_tier', cfg.tier);
  if (cfg.front !== undefined) await writeSetting(userId, 'col_front', String(cfg.front));
  if (cfg.back !== undefined) await writeSetting(userId, 'col_back', String(cfg.back));
  if (cfg.region !== undefined) await writeSetting(userId, 'home_region', cfg.region);
  if (cfg.beaEnabled !== undefined) await writeSetting(userId, BEA_COL.enabledKey, String(cfg.beaEnabled));
  if (cfg.beaKey !== undefined) await writeSetting(userId, BEA_COL.credentialKey!, cfg.beaKey);

  revalidatePath('/');
}

export async function getIntegrationAudit(integrationId: string): Promise<IntegrationAuditRow[]> {
  const userId = await requireAuth();
  return prisma.integration_audit.findMany({
    where: { user_id: userId, integration_id: integrationId },
    orderBy: { created_at: 'desc' },
    take: 20,
  }) as Promise<IntegrationAuditRow[]>;
}
