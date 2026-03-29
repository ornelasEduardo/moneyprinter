'use client';

import { useTransition } from 'react';
import { Button, Card, Text, Stack, Badge, Flex } from 'doom-design-system';
import { undoEntry } from '@/app/actions/audit';
import type { IntegrityWarning } from '@/lib/integrity';
import styles from './HistoryClient.module.scss';

interface AuditEntryRow {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  batch_id: string | null;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

interface HistoryClientProps {
  entries: AuditEntryRow[];
  warnings: IntegrityWarning[];
}

function actionBadgeVariant(action: string): 'success' | 'warning' | 'error' | 'secondary' {
  switch (action) {
    case 'CREATE': return 'success';
    case 'UPDATE': return 'warning';
    case 'DELETE': return 'error';
    default: return 'secondary';
  }
}

export default function HistoryClient({ entries, warnings }: HistoryClientProps) {
  const [isPending, startTransition] = useTransition();

  function handleUndo(entryId: number) {
    startTransition(async () => {
      await undoEntry(entryId);
    });
  }

  return (
    <div className={styles.history}>
      {warnings.length > 0 && (
        <Card className={styles.warnings}>
          <Text as="h2" variant="h5">Integrity Warnings</Text>
          <Stack gap={2}>
            {warnings.map((w, i) => (
              <div key={i} className={styles.warning}>
                <Badge variant="error">{w.type}</Badge>
                <Text>{w.message}</Text>
              </div>
            ))}
          </Stack>
        </Card>
      )}

      <Card>
        <Text as="h2" variant="h5">Activity Log</Text>
        {entries.length === 0 ? (
          <Text>No activity yet.</Text>
        ) : (
          <Stack gap={2}>
            {entries.map((entry) => (
              <div key={entry.id} className={styles.entry}>
                <Flex align="center" gap={2} className={styles.entryInfo}>
                  <Badge variant={actionBadgeVariant(entry.action)}>
                    {entry.action}
                  </Badge>
                  <Text>
                    {entry.entity_type} #{entry.entity_id}
                  </Text>
                  <Text variant="small" className={styles.timestamp}>
                    {new Date(entry.created_at).toLocaleString()}
                  </Text>
                </Flex>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUndo(entry.id)}
                  disabled={isPending}
                  aria-label="Undo"
                >
                  Undo
                </Button>
              </div>
            ))}
          </Stack>
        )}
      </Card>
    </div>
  );
}
