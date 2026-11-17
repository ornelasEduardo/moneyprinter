import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import JSZip from 'jszip';
import { POST } from './route';
import { getCurrentUser } from '@/lib/auth';
import { restoreSnapshot } from '@/lib/restore';

vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }));
vi.mock('@/lib/restore', () => ({ restoreSnapshot: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
const request = (body: Uint8Array, headers: Record<string,string> = {}) => new NextRequest('http://localhost/api/restore', { method:'POST', body: body as BodyInit, headers: { 'content-type':'application/zip', 'x-moneyprinter-restore':'1', ...headers } });
describe('dedicated backup restore upload', () => {
  beforeEach(() => { vi.resetAllMocks(); vi.mocked(getCurrentUser).mockResolvedValue(7); vi.mocked(restoreSnapshot).mockResolvedValue({created:1,skipped:0} as never); });
  it('accepts an archive with more than 1 MiB of expanded valid settings data', async () => {
    const value='x'.repeat(1_100_000);
    const zip=new JSZip();
    zip.file('metadata.json',JSON.stringify({version:1,entities:{user_settings:{count:1}}}));
    zip.file('user_settings.json',JSON.stringify([{id:1,key:'large-setting',value}]));
    const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
    const response=await POST(request(bytes));
    expect(response.status).toBe(200);
    expect(restoreSnapshot).toHaveBeenCalledWith(7,{user_settings:[{id:1,key:'large-setting',value}]});
  });
  it('requires authentication before parsing a submitted archive', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    expect((await POST(request(new Uint8Array()))).status).toBe(401);
    expect(restoreSnapshot).not.toHaveBeenCalled();
  });
  it('rejects oversized uploads explicitly rather than using the Server Action limit', async () => {
    expect((await POST(request(new Uint8Array(21*1024*1024)))).status).toBe(413);
    expect(restoreSnapshot).not.toHaveBeenCalled();
  });
});
