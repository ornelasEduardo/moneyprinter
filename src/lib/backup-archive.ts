import JSZip from 'jszip';
import Papa from 'papaparse';
import { EXPORTABLE_ENTITIES } from './constants';

const STRUCTURED_FIELDS = new Set(['plan_inputs', 'conditions', 'actions']);

/** Read both legacy CSV archives and lossless JSON backups without trusting IDs. */
export async function readBackupArchive(bytes: ArrayBuffer | Uint8Array): Promise<Record<string, Record<string, unknown>[]>> {
  const zip = await JSZip.loadAsync(bytes);
  const metadataFile = zip.file('metadata.json');
  if (!metadataFile) throw new Error('Missing MoneyPrinter backup metadata');
  const metadata = JSON.parse(await metadataFile.async('string'));
  if (metadata.version !== 1 || !metadata.entities || typeof metadata.entities !== 'object') throw new Error('Unsupported MoneyPrinter backup');
  const result: Record<string, Record<string, unknown>[]> = {};
  for (const entity of EXPORTABLE_ENTITIES) {
    const expected = metadata.entities[entity]?.count;
    if (expected == null || expected === 0) continue;
    const json = zip.file(`${entity}.json`);
    const csv = zip.file(`${entity}.csv`);
    if (!json && !csv) throw new Error(`Missing ${entity} data in backup`);
    const text = await (json ?? csv)!.async('string');
    if (text.length > 50_000_000) throw new Error('Backup entity is too large');
    if (json) {
      result[entity] = JSON.parse(text);
    } else {
      const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
      if (parsed.errors.length) throw new Error(`Invalid ${entity} CSV in backup`);
      result[entity] = parsed.data.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => {
        if (value === '') return [key, null];
        if (STRUCTURED_FIELDS.has(key)) {
          try { return [key, JSON.parse(value)]; }
          catch { throw new Error(`The legacy backup contains unreadable ${key}; create a new JSON backup from the source installation`); }
        }
        return [key, value];
      })));
    }
    if (!Array.isArray(result[entity]) || result[entity].length !== expected) throw new Error(`Backup ${entity} count does not match metadata`);
  }
  return result;
}
