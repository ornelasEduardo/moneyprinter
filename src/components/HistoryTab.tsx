'use client';

import { useMemo, useState, useTransition } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Button, Card, Text, Stack, Badge, Flex, Table, Modal } from 'doom-design-system';
import { undoEntry } from '@/app/actions/audit';
import { Undo2 } from 'lucide-react';
import type { IntegrityWarning } from '@/lib/integrity';
import styles from './HistoryTab.module.scss';

export interface AuditEntryRow {
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

interface HistoryTabProps {
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

export default function HistoryTab({ entries, warnings }: HistoryTabProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedEntity, setSelectedEntity] = useState<{ type: string; id: number } | null>(null);

  function handleUndo(entryId: number) {
    startTransition(async () => {
      await undoEntry(entryId);
    });
  }

  function handleRowClick(entry: AuditEntryRow) {
    setSelectedEntity({ type: entry.entity_type, id: entry.entity_id });
  }

  // Get all entries for the selected entity
  const entityHistory = selectedEntity
    ? entries
        .filter((e) => e.entity_type === selectedEntity.type && e.entity_id === selectedEntity.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [];

  const columns = useMemo<ColumnDef<AuditEntryRow>[]>(
    () => [
      {
        accessorKey: 'action',
        header: 'Action',
        cell: (info) => {
          const action = info.getValue() as string;
          const isUndone = info.row.original.undone_at !== null;
          return (
            <div
              className={styles.clickableCell}
              onClick={() => handleRowClick(info.row.original)}
            >
              {isUndone ? (
                <Badge variant="error">UNDONE</Badge>
              ) : (
                <Badge variant={actionBadgeVariant(action)}>{action}</Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'entity_type',
        header: 'Entity',
        cell: (info) => {
          const isUndone = info.row.original.undone_at !== null;
          return (
            <div
              className={styles.clickableCell}
              onClick={() => handleRowClick(info.row.original)}
            >
              <Text className={isUndone ? styles.mutedText : ''}>
                {formatEntityType(info.getValue() as string)} #{info.row.original.entity_id}
              </Text>
            </div>
          );
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Date',
        cell: (info) => (
          <div
            className={styles.clickableCell}
            onClick={() => handleRowClick(info.row.original)}
          >
            <Text color="muted">
              {new Date(info.getValue() as string).toLocaleString()}
            </Text>
          </div>
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
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleUndo(info.row.original.id);
                }}
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
    [isPending, entries]
  );

  return (
    <Stack gap={4}>
      {warnings.length > 0 && (
        <Card className={styles.warningsCard}>
          <Stack gap={3}>
            <Text variant="h4">Integrity Warnings</Text>
            <Stack gap={2}>
              {warnings.map((w, i) => (
                <Flex key={i} align="center" gap={3}>
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

      <Modal
        isOpen={selectedEntity !== null}
        onClose={() => setSelectedEntity(null)}
      >
        <Modal.Header>
          <Text variant="h4">
            {selectedEntity && `${formatEntityType(selectedEntity.type)} #${selectedEntity.id}`}
          </Text>
        </Modal.Header>
        <Modal.Body>
          <Stack gap={3}>
            {entityHistory.map((entry) => (
              <Flex key={entry.id} align="center" gap={3} className={styles.modalEntry}>
                {entry.undone_at ? (
                  <Badge variant="error">UNDONE</Badge>
                ) : (
                  <Badge variant={actionBadgeVariant(entry.action)}>{entry.action}</Badge>
                )}
                <Stack gap={1}>
                  <Text>{new Date(entry.created_at).toLocaleString()}</Text>
                  {entry.previous_value && (
                    <Text variant="small" color="muted">
                      From: {JSON.stringify(entry.previous_value)}
                    </Text>
                  )}
                  {entry.new_value && (
                    <Text variant="small" color="muted">
                      To: {JSON.stringify(entry.new_value)}
                    </Text>
                  )}
                </Stack>
              </Flex>
            ))}
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={() => setSelectedEntity(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Stack>
  );
}
