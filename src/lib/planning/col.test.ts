import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: { user_settings: { findUnique: vi.fn(), upsert: vi.fn() } },
}));
vi.mock('@/lib/integrations/client', () => ({ governedFetch: vi.fn() }));

import prisma from '@/lib/prisma';
import { governedFetch } from '@/lib/integrations/client';
import { NATIONAL, TIER_PRESETS, scaleFromRentsRpp, parseBeaRentsRpp } from './col';
import { loadColThresholds } from './col-loader';

// helper: make user_settings.findUnique resolve a map of key->value
const settings = (map: Record<string, string>) =>
  (prisma.user_settings.findUnique as any).mockImplementation(({ where }: any) =>
    Promise.resolve(map[where.user_id_key.key] !== undefined ? { value: map[where.user_id_key.key] } : null));

describe('scaleFromRentsRpp', () => {
  it('national (rpp 100) → 0.28 / 0.36', () => {
    expect(scaleFromRentsRpp(100)).toEqual({ front: 0.28, back: 0.36 });
  });
  it('VHCOL (rpp 154.3) → capped at 0.43 / 0.52', () => {
    expect(scaleFromRentsRpp(154.3)).toEqual({ front: 0.43, back: 0.52 });
  });
  it('low COL (rpp 54) → floored at national, never below', () => {
    expect(scaleFromRentsRpp(54)).toEqual({ front: 0.28, back: 0.36 });
  });
  it('moderate (rpp 120) → scaled between', () => {
    const t = scaleFromRentsRpp(120);
    expect(t.front).toBeCloseTo(0.34, 2);
    expect(t.back).toBeCloseTo(0.43, 2);
  });
});

describe('parseBeaRentsRpp', () => {
  it('reads DataValue from the BEA API envelope', () => {
    const json = { BEAAPI: { Results: { Data: [{ GeoFips: '41860', GeoName: 'San Francisco', DataValue: '154.3' }] } } };
    expect(parseBeaRentsRpp(json)).toBeCloseTo(154.3, 1);
  });
  it('handles thousands separators', () => {
    const json = { BEAAPI: { Results: { Data: [{ DataValue: '1,203' }] } } };
    expect(parseBeaRentsRpp(json)).toBe(1203);
  });
});

describe('colThresholds signal', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('manual mode with a tier preset returns that preset + a source label', async () => {
    settings({ col_mode: 'manual', col_tier: 'veryHigh' });
    const t = await loadColThresholds(2);
    expect(t).toMatchObject(TIER_PRESETS.veryHigh);
    expect(t.source).toMatch(/very high/i);
  });

  it('manual mode with custom caps returns them (custom wins over tier)', async () => {
    settings({ col_mode: 'manual', col_tier: 'standard', col_front: '0.40', col_back: '0.48' });
    const t = await loadColThresholds(2);
    expect(t).toMatchObject({ front: 0.40, back: 0.48 });
    expect(t.source).toMatch(/custom/i);
  });

  it('unset mode falls back to NATIONAL', async () => {
    settings({});
    expect(await loadColThresholds(2)).toMatchObject(NATIONAL);
  });

  it('bea mode fetches, scales, names the region, and caches', async () => {
    settings({ col_mode: 'bea', home_region: '41860', 'integration.bea-col.key': 'test-key-123' });
    (governedFetch as any).mockResolvedValue(
      new Response(JSON.stringify({ BEAAPI: { Results: { Data: [{ GeoName: 'San Francisco, CA', DataValue: '154.3' }] } } })));
    const t = await loadColThresholds(2);
    expect(t).toMatchObject({ front: 0.43, back: 0.52, source: 'San Francisco, CA' });
    expect(t.detail).toMatch(/54% above/); // 154.3 rents RPP → 54% above national
    expect(governedFetch).toHaveBeenCalledTimes(1);
    expect((prisma.user_settings.upsert as any)).toHaveBeenCalled(); // cache write
  });

  it('bea mode falls back to manual/national when the fetch throws', async () => {
    settings({ col_mode: 'bea', home_region: '41860', 'integration.bea-col.key': 'test-key-123', col_tier: 'high' });
    (governedFetch as any).mockRejectedValue(new Error('offline'));
    expect(await loadColThresholds(2)).toMatchObject(TIER_PRESETS.high); // falls back to manual tier
    expect(governedFetch).toHaveBeenCalledTimes(1); // reached the fetch, then fell back
  });
});
