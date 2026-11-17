'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Field, Input, Stack, Text } from 'doom-design-system';
import { readBackupArchive } from '@/lib/backup-archive';
import { restoreBackupAction } from '@/app/actions/restore';

export default function RestoreBackupForm() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<Record<string, Record<string, unknown>[]> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const count = snapshot ? Object.values(snapshot).reduce((total, rows) => total + rows.length, 0) : 0;

  const loadFile = async (file?: File) => {
    setSnapshot(null);
    setError('');
    setMessage('');
    if (!file) return;
    setBusy(true);
    try { setSnapshot(await readBackupArchive(await file.arrayBuffer())); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to read backup'); }
    finally { setBusy(false); }
  };

  const restore = async () => {
    if (!snapshot) return;
    setBusy(true);
    setError('');
    try {
      const result = await restoreBackupAction(snapshot);
      setSnapshot(null);
      setMessage(`Restored ${result.created} records. Existing records were preserved.`);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to restore backup'); }
    finally { setBusy(false); }
  };

  return <Card><Stack gap={3}>
    <Text variant="h5">Restore backup</Text>
    <Text color="muted">Restoring creates copies with new IDs and preserves payment and refund links. Existing data stays in place. Restoring the same archive twice creates duplicate records.</Text>
    <Field label="Backup archive" htmlFor="backup-archive">
      <Input id="backup-archive" type="file" accept=".zip" disabled={busy} onChange={(event) => void loadFile(event.target.files?.[0])} />
    </Field>
    {snapshot && <>
      <Text>{count} records ready to restore.</Text>
      <Button disabled={busy || count === 0} onClick={() => void restore()}>{busy ? 'Restoring…' : 'Restore copies'}</Button>
    </>}
    {message && <Text role="status">{message}</Text>}
    {error && <Text role="alert" color="error">{error}</Text>}
  </Stack></Card>;
}
