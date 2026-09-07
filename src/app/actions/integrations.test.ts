import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/action-middleware', () => ({ requireAuth: vi.fn(async () => 2) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  default: {
    user_settings: { findUnique: vi.fn(), upsert: vi.fn() },
    integration_audit: { findMany: vi.fn() },
  },
}));

import prisma from '@/lib/prisma';
import { savePlanningColConfig, getPlanningColConfig, getIntegrationAudit } from './integrations';

const settings = (map: Record<string, string>) =>
  (prisma.user_settings.findUnique as any).mockImplementation(({ where }: any) =>
    Promise.resolve(map[where.user_id_key.key] !== undefined ? { value: map[where.user_id_key.key] } : null));

describe('savePlanningColConfig validation', () => {
  beforeEach(() => { vi.clearAllMocks(); (prisma.user_settings.upsert as any).mockResolvedValue({}); settings({}); });

  it('accepts a valid tier config and writes col_mode + col_tier', async () => {
    await savePlanningColConfig({ mode: 'manual', tier: 'veryHigh' });
    const keys = (prisma.user_settings.upsert as any).mock.calls.map((c: any) => c[0].where.user_id_key.key);
    expect(keys).toContain('col_mode');
    expect(keys).toContain('col_tier');
  });

  it('accepts valid custom caps (front <= back, in range)', async () => {
    await expect(savePlanningColConfig({ mode: 'manual', front: 0.40, back: 0.48 })).resolves.toBeUndefined();
  });

  it('rejects front > back', async () => {
    await expect(savePlanningColConfig({ mode: 'manual', front: 0.50, back: 0.40 }))
      .rejects.toThrow('front cap must be <= back cap');
  });

  it('rejects a single custom cap (both required together)', async () => {
    await expect(savePlanningColConfig({ mode: 'manual', front: 0.40 })).rejects.toThrow();
  });

  it('rejects out-of-range caps', async () => {
    await expect(savePlanningColConfig({ mode: 'manual', front: 0.05, back: 0.9 })).rejects.toThrow();
  });

  it('rejects enabling BEA with no key available (neither input nor stored)', async () => {
    settings({}); // no stored key
    await expect(savePlanningColConfig({ mode: 'bea', beaEnabled: true, region: '41860' })).rejects.toThrow(/key/i);
  });

  it('allows enabling BEA when a key is provided in the input', async () => {
    await expect(savePlanningColConfig({ mode: 'bea', beaEnabled: true, region: '41860', beaKey: 'k-123' })).resolves.toBeUndefined();
    const keys = (prisma.user_settings.upsert as any).mock.calls.map((c: any) => c[0].where.user_id_key.key);
    expect(keys).toContain('integration.bea-col.enabled');
    expect(keys).toContain('integration.bea-col.key');
  });
});

describe('getPlanningColConfig', () => {
  beforeEach(() => vi.clearAllMocks());
  it('returns parsed config and hasBeaKey WITHOUT exposing the raw key', async () => {
    settings({ col_mode: 'bea', col_tier: 'high', home_region: '41860', 'integration.bea-col.enabled': 'true', 'integration.bea-col.key': 'secret' });
    const cfg = await getPlanningColConfig();
    expect(cfg.mode).toBe('bea');
    expect(cfg.tier).toBe('high');
    expect(cfg.region).toBe('41860');
    expect(cfg.beaEnabled).toBe(true);
    expect(cfg.hasBeaKey).toBe(true);
    expect((cfg as any).beaKey).toBeUndefined();     // never returned
    expect(JSON.stringify(cfg)).not.toContain('secret');
  });
  it('defaults to manual when unset', async () => {
    settings({});
    const cfg = await getPlanningColConfig();
    expect(cfg.mode).toBe('manual');
    expect(cfg.hasBeaKey).toBe(false);
  });
});

describe('getIntegrationAudit', () => {
  it('returns recent egress rows for the integration', async () => {
    (prisma.integration_audit.findMany as any).mockResolvedValue([
      { id: 1, integration_id: 'bea-col', host: 'apps.bea.gov', purpose: 'Fetch rents RPP for region 41860', created_at: new Date(0) },
    ]);
    const rows = await getIntegrationAudit('bea-col');
    expect(rows).toHaveLength(1);
    expect(rows[0].host).toBe('apps.bea.gov');
    const where = (prisma.integration_audit.findMany as any).mock.calls[0][0].where;
    expect(where).toEqual({ user_id: 2, integration_id: 'bea-col' });
  });
});
