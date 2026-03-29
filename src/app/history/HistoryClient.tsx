'use client';

import { useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { Button, Card, Text, Stack, Badge, Flex, Table } from 'doom-design-system';
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

  const columns = useMemo<ColumnDef<AuditEntryRow>[]>(
    () => [
      {
        accessorKey: 'action',
        header: 'Action',
        cell: (info) => {
          const action = info.getValue() as string;
          const isUndone = info.row.original.undone_at !== null;
          return (
            <Flex gap={2} align="center">
              <Badge variant={isUndone ? 'secondary' : actionBadgeVariant(action)}>
                {action}
              </Badge>
              {isUndone && <Badge variant="error">undone</Badge>}
            </Flex>
          );
        },
      },
      {
        accessorKey: 'entity_type',
        header: 'Entity',
        cell: (info) => {
          const isUndone = info.row.original.undone_at !== null;
          return (
            <Text className={isUndone ? styles.mutedText : ''}>
              {formatEntityType(info.getValue() as string)} #{info.row.original.entity_id}
            </Text>
          );
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Date',
        cell: (info) => (
          <Text color="muted">
            {new Date(info.getValue() as string).toLocaleString()}
          </Text>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: (info) => {
          const isUndone = info.row.original.undone_at !== null;
          if (isUndone) return null;
          return (
            <Flex justify="flex-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUndo(info.row.original.id)}
                disabled={isPending}
                aria-label="Undo"
              >
                <Undo2 size={14} strokeWidth={2.5} />
                Undo
              </Button>
            </Flex>
          );
        },
      },
    ],
    [isPending]
  );

  return (
    <div className={styles.history}>
      <Flex justify="space-between" align="center" gap={4} className={styles.header}>
        <Flex gap={4} align="center">
          <Logo size={48} />
          <Text variant="h1" className="uppercase">MoneyPrinter</Text>
        </Flex>
        <Button variant="secondary" onClick={() => router.push('/')}>
          <ArrowLeft size={18} strokeWidth={2.5} />
          <span>Dashboard</span>
        </Button>
      </Flex>

      <Text variant="h2">History</Text>

      {warnings.length > 0 && (
        <Card className={`${styles.warningsCard} ${styles.cardInner}`}>
          <Stack gap={3}>
            <Text variant="h4">Integrity Warnings</Text>
            <Stack gap={2}>
              {warnings.map((w, i) => (
                <Flex key={i} align="center" gap={3} className={styles.warning}>
                  <Badge variant="error">{w.type.replace(/_/g, ' ')}</Badge>
                  <Text>{w.message}</Text>
                </Flex>
              ))}
            </Stack>
          </Stack>
        </Card>
      )}

      <Card className={styles.cardInner}>
        <Stack gap={4}>
          <Text variant="h4">Activity Log</Text>
          {entries.length === 0 ? (
            <Text color="muted">No activity yet.</Text>
          ) : (
            <Table
              data={entries}
              columns={columns}
              enablePagination
              enableFiltering
              enableSorting
              variant="flat"
              striped
              pageSize={20}
            />
          )}
        </Stack>
      </Card>
    </div>
  );
}
