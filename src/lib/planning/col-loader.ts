// Server-only implementation of the colThresholds signal (Prisma + the
// governed BEA fetch). Split from col.ts so col.ts's pure types/identity
// stay safe to import from mortgage.ts, which MortgageCalculator.tsx (a
// client component) also imports. See signal-loaders.ts for the full
// rationale.
import prisma from '@/lib/prisma';
import { governedFetch } from '@/lib/integrations/client';
import { BEA_COL } from '@/lib/integrations/registry';
import { NATIONAL, TIER_PRESETS, scaleFromRentsRpp, parseBeaRentsRpp, type ColThresholds } from './col';

async function getSetting(userId: number, key: string): Promise<string | undefined> {
  const row = await prisma.user_settings.findUnique({
    where: { user_id_key: { user_id: userId, key } },
  });
  return row?.value ?? undefined;
}

async function manualOrNational(userId: number): Promise<ColThresholds> {
  const front = await getSetting(userId, 'col_front');
  const back = await getSetting(userId, 'col_back');
  if (front !== undefined && back !== undefined) {
    return { front: Number(front), back: Number(back) };
  }
  const tier = await getSetting(userId, 'col_tier');
  if (tier && TIER_PRESETS[tier]) return TIER_PRESETS[tier];
  return NATIONAL;
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

async function beaThresholds(userId: number): Promise<ColThresholds> {
  const geoFips = await getSetting(userId, 'home_region');
  const key = await getSetting(userId, BEA_COL.credentialKey!);
  if (!geoFips || !key) throw new Error('BEA mode needs a region and an API key');

  const res = await governedFetch(userId, BEA_COL.id, beaUrl(geoFips, key),
    `Fetch rents RPP for region ${geoFips}`);
  const rentsRpp = parseBeaRentsRpp(await res.json());
  const caps = scaleFromRentsRpp(rentsRpp);

  await prisma.user_settings.upsert({
    where: { user_id_key: { user_id: userId, key: 'integration.bea-col.cache' } },
    create: { user_id: userId, key: 'integration.bea-col.cache', value: JSON.stringify(caps) },
    update: { value: JSON.stringify(caps) },
  });
  return caps;
}

export async function loadColThresholds(userId: number): Promise<ColThresholds> {
  const mode = await getSetting(userId, 'col_mode');
  if (mode === 'bea') {
    try { return await beaThresholds(userId); }
    catch { return await manualOrNational(userId); }
  }
  return await manualOrNational(userId);
}
