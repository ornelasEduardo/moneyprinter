// Server-only implementation of the colThresholds signal (Prisma + the
// governed BEA fetch). Split from col.ts so col.ts's pure types/identity
// stay safe to import from mortgage.ts, which MortgageCalculator.tsx (a
// client component) also imports. See signal-loaders.ts for the full
// rationale.
import prisma from '@/lib/prisma';
import { governedFetch } from '@/lib/integrations/client';
import { BEA_COL } from '@/lib/integrations/registry';
import { NATIONAL, TIER_PRESETS, TIER_LABELS, scaleFromRentsRpp, parseBeaRentsRpp, parseBeaGeoName, type ColResolution } from './col';

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

// GeoFips of the user's metro is the only thing that leaves the machine.
function beaUrl(geoFips: string, key: string): string {
  const params = new URLSearchParams({
    UserID: key, method: 'GetData', datasetname: 'Regional',
    TableName: 'MARPP', LineCode: '4', GeoFips: geoFips, Year: 'LAST', ResultFormat: 'json',
  });
  return `https://apps.bea.gov/api/data?${params.toString()}`;
  // NOTE: LineCode '4' = Rents component; verify against live BEA API when a key is available.
}

async function beaThresholds(userId: number): Promise<ColResolution> {
  const geoFips = await getSetting(userId, 'home_region');
  const key = await getSetting(userId, BEA_COL.credentialKey!);
  if (!geoFips || !key) throw new Error('BEA mode needs a region and an API key');

  const res = await governedFetch(userId, BEA_COL.id, beaUrl(geoFips, key),
    `Fetch rents RPP for region ${geoFips}`);
  const json = await res.json();
  const rentsRpp = parseBeaRentsRpp(json);
  const gap = Math.round(rentsRpp - 100);
  const resolution: ColResolution = {
    ...scaleFromRentsRpp(rentsRpp),
    source: parseBeaGeoName(json) ?? `Region ${geoFips}`,
    detail: `BEA cost-of-living · rents ${Math.abs(gap)}% ${gap >= 0 ? 'above' : 'below'} the national average`,
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
