'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Text, Stack, Badge, Flex } from 'doom-design-system';
import { Logo } from '@/components/Logo';
import { undoEntry } from '@/app/actions/audit';
import { ArrowLeft, Undo2 } from 'lucide-react';
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
  undone_at: string | null;
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

function formatEntityType(type: string): string {
  return type.replace(/_/g, ' ');
}

export default function HistoryClient({ entries, warnings }: HistoryClientProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleUndo(entryId: number) {
    startTransition(async () => {
      await undoEntry(entryId);
    });
  }

  return (
    <div className={styles.history}>
      <Flex justify="space-between" align="center" gap={4} className={styles.header}>
        <Flex gap={4} align="center">
          <Logo size={48} />
          <Text variant="h1" className="uppercase" style={{ margin: 0 }}>
            MoneyPrinter
          </Text>
        </Flex>
        <Button variant="secondary" onClick={() => router.push('/')}>
          <ArrowLeft size={18} strokeWidth={2.5} />
          <span>Dashboard</span>
        </Button>
      </Flex>

      <Text variant="h2" style={{ margin: 0 }}>History</Text>

      {warnings.length > 0 && (
        <Card className={styles.warningsCard}>
          <Text variant="h4" style={{ margin: 0 }}>Integrity Warnings</Text>
          <Stack gap={2}>
            {warnings.map((w, i) => (
              <Flex key={i} align="center" gap={2} className={styles.warning}>
                <Badge variant="error">{w.type.replace(/_/g, ' ')}</Badge>
                <Text>{w.message}</Text>
              </Flex>
            ))}
          </Stack>
        </Card>
      )}

      <Card>
        <Text variant="h4" style={{ margin: 0, marginBottom: 'var(--space-md)' }}>Activity Log</Text>
        {entries.length === 0 ? (
          <Text color="muted">No activity yet.</Text>
        ) : (
          <Stack gap={0}>
            {entries.map((entry) => {
              const isUndone = entry.undone_at !== null;
              return (
                <div
                  key={entry.id}
                  className={`${styles.entry} ${isUndone ? styles.undone : ''}`}
                >
                  <Flex align="center" gap={2} wrap={true} className={styles.entryInfo}>
                    <Badge variant={isUndone ? 'secondary' : actionBadgeVariant(entry.action)}>
                      {entry.action}
                    </Badge>
                    {isUndone && (
                      <Badge variant="outline">undone</Badge>
                    )}
                    <Text className={isUndone ? styles.mutedText : ''}>
                      {formatEntityType(entry.entity_type)} #{entry.entity_id}
                    </Text>
                    <Text variant="small" color="muted">
                      {new Date(entry.created_at).toLocaleString()}
                    </Text>
                  </Flex>
                  {!isUndone && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUndo(entry.id)}
                      disabled={isPending}
                      aria-label="Undo"
                    >
                      <Undo2 size={14} />
                      Undo
                    </Button>
                  )}
                </div>
              );
            })}
          </Stack>
        )}
      </Card>
    </div>
  );
}
