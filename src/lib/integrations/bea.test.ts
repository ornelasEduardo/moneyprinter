import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./client', () => ({ governedFetch: vi.fn() }));

import { governedFetch } from './client';
import { beaMetroRpp, beaRegionalGetData, latestBeaRow } from './bea';

const beaResponse = (body: unknown) => new Response(JSON.stringify(body));

describe('latestBeaRow', () => {
  it('picks the row with the greatest TimePeriod', () => {
    const rows = [
      { geoFips: '41740', geoName: 'SD', timePeriod: '2022', dataValue: '170' },
      { geoFips: '41740', geoName: 'SD', timePeriod: '2024', dataValue: '179' },
      { geoFips: '41740', geoName: 'SD', timePeriod: '2023', dataValue: '175' },
    ];
    expect(latestBeaRow(rows).timePeriod).toBe('2024');
  });
});

describe('beaRegionalGetData', () => {
  beforeEach(() => vi.clearAllMocks());

  it('routes through governedFetch with the BEA integration + query params', async () => {
    (governedFetch as any).mockResolvedValue(
      beaResponse({ BEAAPI: { Results: { Data: [{ GeoFips: '41740', GeoName: 'SD', TimePeriod: '2024', DataValue: '179.267' }] } } }));
    const rows = await beaRegionalGetData(2, 'KEY', { tableName: 'MARPP', lineCode: 3, geoFips: '41740' }, 'test');
    expect(rows).toEqual([{ geoFips: '41740', geoName: 'SD', timePeriod: '2024', dataValue: '179.267' }]);
    const [userId, integrationId, url] = (governedFetch as any).mock.calls[0];
    expect(userId).toBe(2);
    expect(integrationId).toBe('bea-col');
    expect(url).toContain('TableName=MARPP');
    expect(url).toContain('LineCode=3');
    expect(url).toContain('GeoFips=41740');
    expect(url).toContain('Year=ALL'); // MARPP has no 'LAST'
  });

  it('throws on a BEA API error envelope', async () => {
    (governedFetch as any).mockResolvedValue(
      beaResponse({ BEAAPI: { Results: { Error: { APIErrorCode: '98', APIErrorDescription: 'Internal API error' } } } }));
    await expect(beaRegionalGetData(2, 'KEY', { tableName: 'MARPP', lineCode: 3, geoFips: 'bogus' }, 'x')).rejects.toThrow(/BEA API error/);
  });

  it('throws on an empty result', async () => {
    (governedFetch as any).mockResolvedValue(beaResponse({ BEAAPI: { Results: { Data: [] } } }));
    await expect(beaRegionalGetData(2, 'KEY', { tableName: 'MARPP', lineCode: 3, geoFips: '41740' }, 'x')).rejects.toThrow(/no data/);
  });
});

describe('beaMetroRpp', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the latest-year rents parity with a cleaned metro name', async () => {
    (governedFetch as any).mockResolvedValue(
      beaResponse({ BEAAPI: { Results: { Data: [
        { GeoName: 'San Diego-Chula Vista-Carlsbad, CA (Metropolitan Statistical Area)', TimePeriod: '2023', DataValue: '175.0' },
        { GeoName: 'San Diego-Chula Vista-Carlsbad, CA (Metropolitan Statistical Area)', TimePeriod: '2024', DataValue: '179.267' },
      ] } } }));
    const r = await beaMetroRpp(2, 'KEY', '41740', 'rents');
    expect(r.value).toBeCloseTo(179.267, 2);
    expect(r.year).toBe('2024');
    expect(r.geoName).toBe('San Diego-Chula Vista-Carlsbad, CA');
  });

  it('rejects a non-numeric value instead of reading it as 0', async () => {
    (governedFetch as any).mockResolvedValue(
      beaResponse({ BEAAPI: { Results: { Data: [{ GeoName: 'X', TimePeriod: '2024', DataValue: '(NA)' }] } } }));
    await expect(beaMetroRpp(2, 'KEY', '41740', 'rents')).rejects.toThrow();
  });
});
