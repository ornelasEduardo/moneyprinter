import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: {
    user_settings: { findUnique: vi.fn() },
    integration_audit: { create: vi.fn() },
  },
}));

import prisma from '@/lib/prisma';
import { governedFetch } from './client';

const enabled = () => (prisma.user_settings.findUnique as any).mockResolvedValue({ value: 'true' });
const disabled = () => (prisma.user_settings.findUnique as any).mockResolvedValue({ value: 'false' });

describe('governedFetch', () => {
  beforeEach(() => {
    // vi.restoreAllMocks() only restores vi.spyOn() spies to their original
    // implementation; it does not clear call history on plain vi.fn() mocks
    // (the ones created in the vi.mock('@/lib/prisma') factory below), so
    // stale calls from a prior test leak into the next. vi.resetAllMocks()
    // clears history + implementation for both.
    vi.resetAllMocks();
    (prisma.integration_audit.create as any).mockResolvedValue({});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok')));
  });

  it('fetches when enabled + host allowlisted, and writes one audit row', async () => {
    enabled();
    const res = await governedFetch(2, 'bea-col', 'https://apps.bea.gov/api/data?x=1', 'fetch RPP for SF');
    expect(await res.text()).toBe('ok');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((prisma.integration_audit.create as any)).toHaveBeenCalledTimes(1);
    const row = (prisma.integration_audit.create as any).mock.calls[0][0].data;
    expect(row).toEqual({ user_id: 2, integration_id: 'bea-col', host: 'apps.bea.gov', purpose: 'fetch RPP for SF' });
  });

  it('throws and does NOT fetch or audit when the integration is disabled', async () => {
    disabled();
    await expect(governedFetch(2, 'bea-col', 'https://apps.bea.gov/api', 'x')).rejects.toThrow(/not enabled/);
    expect(fetch).not.toHaveBeenCalled();
    expect((prisma.integration_audit.create as any)).not.toHaveBeenCalled();
  });

  it('throws and does NOT fetch or audit when the host is off-allowlist', async () => {
    enabled();
    await expect(governedFetch(2, 'bea-col', 'https://evil.example.com/api', 'x')).rejects.toThrow(/not allowlisted/);
    expect(fetch).not.toHaveBeenCalled();
    expect((prisma.integration_audit.create as any)).not.toHaveBeenCalled();
  });

  it('throws on an unknown integration id', async () => {
    await expect(governedFetch(2, 'nope', 'https://apps.bea.gov/api', 'x')).rejects.toThrow(/unknown integration/i);
  });
});
