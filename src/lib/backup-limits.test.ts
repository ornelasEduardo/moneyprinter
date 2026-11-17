import { describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { readBackupArchive } from './backup-archive';
vi.mock('./restore-limits', () => ({ MAX_RESTORE_ARCHIVE_BYTES: 20*1024*1024, MAX_RESTORE_EXPANDED_BYTES: 1000 }));
describe('expanded backup size limit', () => {
  it('limits the total expanded data across entities rather than each entity separately', async () => {
    const zip=new JSZip();
    zip.file('metadata.json',JSON.stringify({version:1,entities:{accounts:{count:1},transactions:{count:1}}}));
    zip.file('accounts.json',JSON.stringify([{id:1,name:'a'.repeat(550)}]));
    zip.file('transactions.json',JSON.stringify([{id:2,name:'b'.repeat(550)}]));
    await expect(readBackupArchive(await zip.generateAsync({type:'uint8array',compression:'DEFLATE'}))).rejects.toThrow(/expanded.*too large/i);
  });
});
