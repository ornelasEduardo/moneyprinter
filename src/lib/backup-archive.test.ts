import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { readBackupArchive } from './backup-archive';

describe('backup ZIP parsing', () => {
  it('prefers lossless JSON entities and retains relationship IDs', async () => {
    const zip = new JSZip();
    zip.file('metadata.json', JSON.stringify({ version: 1, entities: { transactions: { count: 1 } } }));
    zip.file('transactions.json', JSON.stringify([{ id: 1, type: 'refund', original_transaction_id: 2 }]));
    zip.file('transactions.csv', 'id,type\n1,expense');
    const result = await readBackupArchive(await zip.generateAsync({ type: 'uint8array' }));
    expect(result.transactions).toEqual([{ id: 1, type: 'refund', original_transaction_id: 2 }]);
  });

  it('reads legacy CSV with nullable links and structured fields', async () => {
    const zip = new JSZip();
    zip.file('metadata.json', JSON.stringify({ version: 1, entities: { transactions: { count: 1 } } }));
    zip.file('transactions.csv', 'id,name,original_transaction_id,transfer_id,tags\n1,Coffee,,,');
    const result = await readBackupArchive(await zip.generateAsync({ type: 'uint8array' }));
    expect(result.transactions[0]).toMatchObject({ id: '1', name: 'Coffee', original_transaction_id: null, transfer_id: null, tags: null });
  });

  it('rejects an archive missing a declared nonempty entity', async () => {
    const zip = new JSZip();
    zip.file('metadata.json', JSON.stringify({ version: 1, entities: { transactions: { count: 1 } } }));
    await expect(readBackupArchive(await zip.generateAsync({ type: 'uint8array' }))).rejects.toThrow(/missing/i);
  });
});
