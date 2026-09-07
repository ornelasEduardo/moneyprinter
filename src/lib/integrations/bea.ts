// A small reusable client for BEA's public "Regional" dataset, routed through
// the governed egress path (opt-in + host allowlist + audit). Consumers name a
// table / component / region; this owns the API envelope, error handling, and
// latest-year selection. Extend with new helpers (other tables or components)
// rather than re-deriving the request anywhere else.
import { governedFetch } from './client';
import { BEA_COL } from './registry';

const BEA_DATA_URL = 'https://apps.bea.gov/api/data';

export interface BeaRow {
  geoFips: string;
  geoName: string;
  timePeriod: string;
  dataValue: string;
}

export interface BeaRegionalQuery {
  tableName: string;         // e.g. 'MARPP' (metro RPP)
  lineCode: string | number; // the table's component line
  geoFips: string;           // CBSA metro / state / national code
  year?: string;             // defaults to 'ALL' — MARPP has no 'LAST'
}

// Run a Regional GetData query through governedFetch. Throws on a BEA API error
// or an empty result — never returns a placeholder value.
export async function beaRegionalGetData(
  userId: number,
  apiKey: string,
  query: BeaRegionalQuery,
  purpose: string,
): Promise<BeaRow[]> {
  const url = `${BEA_DATA_URL}?${new URLSearchParams({
    UserID: apiKey,
    method: 'GetData',
    datasetname: 'Regional',
    ResultFormat: 'json',
    TableName: query.tableName,
    LineCode: String(query.lineCode),
    GeoFips: query.geoFips,
    Year: query.year ?? 'ALL',
  })}`;

  const res = await governedFetch(userId, BEA_COL.id, url, purpose);
  const json = (await res.json()) as any;
  const results = json?.BEAAPI?.Results;
  const error = results?.Error ?? json?.BEAAPI?.Error;
  if (error) {
    throw new Error(`BEA API error: ${error.APIErrorDescription ?? JSON.stringify(error)}`);
  }
  const data = results?.Data;
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('BEA returned no data for this query');
  }
  return data.map((d: any) => ({
    geoFips: String(d.GeoFips ?? ''),
    geoName: String(d.GeoName ?? ''),
    timePeriod: String(d.TimePeriod ?? ''),
    dataValue: String(d.DataValue ?? ''),
  }));
}

// Most recent row (max TimePeriod) from a multi-year result.
export function latestBeaRow(rows: BeaRow[]): BeaRow {
  return rows.reduce((a, b) => (Number(b.timePeriod) >= Number(a.timePeriod) ? b : a));
}

// Regional Price Parity components, by their MARPP/SARPP line code.
export const RPP_COMPONENT = {
  allItems: 1,
  goods: 2,
  rents: 3,
  utilities: 4,
  otherServices: 5,
} as const;
export type RppComponent = keyof typeof RPP_COMPONENT;

export interface MetroRpp {
  value: number;   // price parity; national average = 100
  geoName: string; // cleaned metro name
  year: string;
}

// Latest metro Regional Price Parity for a component (e.g. rents).
export async function beaMetroRpp(
  userId: number,
  apiKey: string,
  geoFips: string,
  component: RppComponent,
): Promise<MetroRpp> {
  const rows = await beaRegionalGetData(
    userId,
    apiKey,
    { tableName: 'MARPP', lineCode: RPP_COMPONENT[component], geoFips },
    `BEA ${component} price parity for region ${geoFips}`,
  );
  const row = latestBeaRow(rows);
  const value = Number(row.dataValue.replace(/,/g, ''));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`BEA returned a non-numeric value: ${row.dataValue}`);
  }
  return { value, geoName: cleanGeoName(row.geoName), year: row.timePeriod };
}

function cleanGeoName(name: string): string {
  return name.replace(/\s*\(metropolitan statistical area\)\s*$/i, '').trim();
}
