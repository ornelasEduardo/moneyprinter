// Server-only implementation of the colThresholds signal (Prisma + the
// governed BEA fetch). Split from col.ts so col.ts's pure types/identity
// stay safe to import from mortgage.ts, which MortgageCalculator.tsx (a
// client component) also imports. See signal-loaders.ts for the full
// rationale.
import prisma from '@/lib/prisma';
import { BEA_COL } from '@/lib/integrations/registry';
import { beaMetroRpp } from '@/lib/integrations/bea';
import { NATIONAL, TIER_PRESETS, TIER_LABELS, scaleFromRentsRpp, type ColResolution } from './col';

async function getSetting(userId: number, key: string): Promise<string | undefined> {
  const row = await prisma.user_settings.findUnique({
    where: { user_id_key: { user_id: userId, key } },
  });
  return row?.value ?? undefined;
}

async function manualOrNational(userId: number): Promise<ColResolution> {
  const front = await getSetting(userId, 'col_front');
  const back = await getSetting(userId, 'col_back');
  if (front !== undefined && back !== undefined) {
    return { front: Number(front), back: Number(back), source: 'Your custom limits', detail: 'Set manually in Settings' };
  }
  const tier = await getSetting(userId, 'col_tier');
  if (tier && TIER_PRESETS[tier]) return { ...TIER_PRESETS[tier], source: TIER_LABELS[tier] ?? tier };
  return { ...NATIONAL, source: 'National guideline' };
}

async function beaThresholds(userId: number): Promise<ColResolution> {
  const geoFips = await getSetting(userId, 'home_region');
  const key = await getSetting(userId, BEA_COL.credentialKey!);
  if (!geoFips || !key) throw new Error('BEA mode needs a region and an API key');

  const { value: rentsRpp, geoName, year } = await beaMetroRpp(userId, key, geoFips, 'rents');
  const gap = Math.round(rentsRpp - 100);
  const resolution: ColResolution = {
    ...scaleFromRentsRpp(rentsRpp),
    source: geoName || `Region ${geoFips}`,
    detail: `BEA cost-of-living (${year}) · rents ${Math.abs(gap)}% ${gap >= 0 ? 'above' : 'below'} the national average`,
  };

  await prisma.user_settings.upsert({
    where: { user_id_key: { user_id: userId, key: 'integration.bea-col.cache' } },
    create: { user_id: userId, key: 'integration.bea-col.cache', value: JSON.stringify(resolution) },
    update: { value: JSON.stringify(resolution) },
  });
  return resolution;
}

export async function loadColThresholds(userId: number): Promise<ColResolution> {
  const mode = await getSetting(userId, 'col_mode');
  if (mode === 'bea') {
    try { return await beaThresholds(userId); }
    catch { return await manualOrNational(userId); }
  }
  return await manualOrNational(userId);
}
