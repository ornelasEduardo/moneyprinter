import type { Signal } from './signals';

export interface ColThresholds { front: number; back: number }
// Resolved caps plus where they came from, so the calculator can explain them.
export interface ColResolution extends ColThresholds { source: string; detail?: string }

export const NATIONAL: ColThresholds = { front: 0.28, back: 0.36 };
const FRONT_CAP = 0.43;
const BACK_CAP = 0.52;

export const TIER_PRESETS: Record<string, ColThresholds> = {
  standard: { front: 0.28, back: 0.36 },
  high: { front: 0.33, back: 0.41 },
  veryHigh: { front: 0.38, back: 0.47 },
  extreme: { front: 0.43, back: 0.52 },
};

export const TIER_LABELS: Record<string, string> = {
  standard: 'Standard cost-of-living',
  high: 'High cost-of-living',
  veryHigh: 'Very high cost-of-living',
  extreme: 'Extreme cost-of-living',
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
  // Number('') is 0, not NaN — so an absent/blank/placeholder value (a failed
  // or empty BEA response, e.g. an invalid region) must be rejected explicitly,
  // or it silently becomes a "0 rents" reading.
  if (raw == null || String(raw).trim() === '') {
    throw new Error('BEA returned no rents value for this region');
  }
  const n = Number(String(raw).replace(/,/g, ''));
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`BEA returned a non-numeric rents value: ${raw}`);
  }
  return n;
}

export function parseBeaGeoName(json: unknown): string | undefined {
  const data = (json as any)?.BEAAPI?.Results?.Data;
  const name = Array.isArray(data) ? data[0]?.GeoName : undefined;
  return typeof name === 'string' && name.length > 0 ? name : undefined;
}

// Identity only (no `load`) — the loader (Prisma + the governed BEA fetch)
// lives in col-loader.ts, a server-only module, so this file stays safe to
// import from mortgage.ts, which MortgageCalculator.tsx (a client
// component) also imports for its pure math. See signal-loaders.ts.
export const colThresholds: Signal<ColResolution> = { id: 'colThresholds' };
