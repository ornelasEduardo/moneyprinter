import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { readBackupArchive } from '@/lib/backup-archive';
import { restoreSnapshot } from '@/lib/restore';
import { MAX_RESTORE_ARCHIVE_BYTES } from '@/lib/restore-limits';

export const runtime = 'nodejs';

async function readUpload(request: NextRequest): Promise<Uint8Array> {
  const advertised = Number(request.headers.get('content-length'));
  if (advertised > MAX_RESTORE_ARCHIVE_BYTES) throw new Error('Backup upload is too large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Empty backup archive');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_RESTORE_ARCHIVE_BYTES) {
      await reader.cancel();
      throw new Error('Backup upload is too large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUser();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // A custom header and non-simple content type prevent cross-origin form posts.
  if (request.headers.get('x-moneyprinter-restore') !== '1' || request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'Restore must be submitted from MoneyPrinter' }, { status: 403 });
  }
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/zip') {
    return NextResponse.json({ error: 'Upload a ZIP backup archive' }, { status: 415 });
  }
  try {
    const snapshot = await readBackupArchive(await readUpload(request));
    const result = await restoreSnapshot(userId, snapshot);
    revalidatePath('/');
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && /too large/.test(error.message)) {
      return NextResponse.json({ error: 'Backup exceeds the supported size: 20 MiB ZIP, 50 MiB expanded data' }, { status: 413 });
    }
    return NextResponse.json({ error: 'Unable to restore backup. Check the archive and try again.' }, { status: 400 });
  }
}
