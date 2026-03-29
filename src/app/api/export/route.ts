import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { exportEntity, exportEntityCsv, exportAllEntities, buildMetadata, EXPORTABLE_ENTITIES } from '@/lib/export';
import archiver from 'archiver';
import Papa from 'papaparse';
import { PassThrough } from 'node:stream';

export async function GET(request: NextRequest) {
  const userId = await getCurrentUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const entity = searchParams.get('entity');
  const format = searchParams.get('format') || 'csv';

  // Single entity export
  if (entity && entity !== 'all') {
    if (!EXPORTABLE_ENTITIES.includes(entity as any)) {
      return NextResponse.json({ error: 'Unknown entity' }, { status: 400 });
    }

    if (format === 'json') {
      const data = await exportEntity(userId, entity);
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${entity}.json"`,
        },
      });
    }

    const csv = await exportEntityCsv(userId, entity);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${entity}.csv"`,
      },
    });
  }

  // Full archive export
  const entityData = await exportAllEntities(userId);
  const metadata = buildMetadata('export', entityData);
  const date = new Date().toISOString().split('T')[0];

  const passthrough = new PassThrough();
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(passthrough);

  archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

  for (const [name, rows] of Object.entries(entityData)) {
    if (rows.length > 0) {
      const csv = Papa.unparse(rows);
      archive.append(csv, { name: `${name}.csv` });
    }
  }

  archive.finalize();

  const readable = new ReadableStream({
    start(controller) {
      passthrough.on('data', (chunk) => controller.enqueue(chunk));
      passthrough.on('end', () => controller.close());
      passthrough.on('error', (err) => controller.error(err));
    },
  });

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="moneyprinter-export-${date}.zip"`,
    },
  });
}
