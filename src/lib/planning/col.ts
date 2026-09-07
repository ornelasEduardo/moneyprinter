import type { Signal } from './signals';
import prisma from '@/lib/prisma';
import { governedFetch } from '@/lib/integrations/client';
import { BEA_COL } from '@/lib/integrations/registry';

export interface ColThresholds { front: number; back: number }

export const NATIONAL: ColThresholds = { front: 0.28, back: 0.36 };
const FRONT_CAP = 0.43;
const BACK_CAP = 0.52;

export const TIER_PRESETS: Record<string, ColThresholds> = {
  standard: { front: 0.28, back: 0.36 },
  high: { front: 0.33, back: 0.41 },
  veryHigh: { front: 0.38, back: 0.47 },
  extreme: { front: 0.43, back: 0.52 },
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// COL only ever LOOSENS caps above the national floor, and never past the hard cap.
export function scaleFromRentsRpp(rentsRpp: number): ColThresholds {
  const s = rentsRpp / 100;
  return {
    front: Math.min(FRONT_CAP, Math.max(NATIONAL.front, round2(NATIONAL.front * s))),
    back: Math.min(BACK_CAP, Math.max(NATIONAL.back, round2(NATIONAL.back * s))),
  };
}

export function parseBeaRentsRpp(json: unknown): number {
  const data = (json as any)?.BEAAPI?.Results?.Data;
  const raw = Array.isArray(data) ? data[0]?.DataValue : undefined;
  const n = Number(String(raw ?? '').replace(/,/g, ''));
  if (!Number.isFinite(n)) throw new Error('BEA response missing a numeric DataValue');
  return n;
}

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

export const colThresholds: Signal<ColThresholds> = {
  id: 'colThresholds',
  async load(userId: number): Promise<ColThresholds> {
    const mode = await getSetting(userId, 'col_mode');
    if (mode === 'bea') {
      try { return await beaThresholds(userId); }
      catch { return await manualOrNational(userId); }
    }
    return await manualOrNational(userId);
  },
};
