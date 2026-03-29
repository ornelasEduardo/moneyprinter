'use client';

import { useMemo, useState, useTransition } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Button, Card, Text, Stack, Badge, Flex, Table, Modal } from 'doom-design-system';
import { undoEntry } from '@/app/actions/audit';
import { Undo2, RotateCcw } from 'lucide-react';
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

// Timeline event — synthesized from audit entries
interface TimelineEvent {
  key: string;
  label: string;
  variant: 'success' | 'warning' | 'error' | 'secondary';
  timestamp: Date;
  data: Record<string, unknown> | null;
  dataLabel: string;
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

function formatFieldName(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    // Format as currency if it looks like a money field (has decimals)
    if (Number.isFinite(value) && value.toString().includes('.')) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    }
    return value.toLocaleString();
  }
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return new Date(value).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      });
    }
    return value;
  }
  return String(value);
}

function formatTimestamp(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

/** Synthesize timeline events from a single audit entry */
function buildTimelineEvents(entry: AuditEntryRow): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // If undone, show the undo event first (most recent)
  if (entry.undone_at) {
    events.push({
      key: `${entry.id}-undo`,
      label: 'UNDONE',
      variant: 'error',
      timestamp: new Date(entry.undone_at),
      data: null,
      dataLabel: '',
    });
  }

  // The original action
  events.push({
    key: `${entry.id}-original`,
    label: entry.action,
    variant: actionBadgeVariant(entry.action),
    timestamp: new Date(entry.created_at),
    data: entry.action === 'CREATE' ? entry.new_value
        : entry.action === 'DELETE' ? entry.previous_value
        : entry.new_value,
    dataLabel: entry.action === 'DELETE' ? 'Deleted record' : 'Values',
  });

  return events;
}

function ValueDisplay({ label, data }: { label: string; data: Record<string, unknown> }) {
  const fields = Object.entries(data).filter(
    ([key]) => !['id', 'user_id', 'deleted_at'].includes(key)
  );
  if (fields.length === 0) return null;

  return (
    <Stack gap={1}>
      <Text variant="caption" weight="semibold" className="uppercase">{label}</Text>
      <Card className={styles.valueCard}>
        <Stack gap={0}>
          {fields.map(([key, val], i) => (
            <Flex
              key={key}
              justify="space-between"
              align="baseline"
              gap={4}
              className={`${styles.valueRow} ${i < fields.length - 1 ? styles.valueRowBorder : ''}`}
            >
              <Text variant="caption" color="muted">{formatFieldName(key)}</Text>
              <Text variant="small" weight="medium">{formatFieldValue(val)}</Text>
            </Flex>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
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

  // Build timeline: collect all entries for the entity, synthesize events
  const timelineEvents = useMemo(() => {
    if (!selectedEntity) return [];
    return entries
      .filter((e) => e.entity_type === selectedEntity.type && e.entity_id === selectedEntity.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .flatMap(buildTimelineEvents);
  }, [selectedEntity, entries]);

  const columns = useMemo<ColumnDef<AuditEntryRow>[]>(
    () => [
      {
        accessorKey: 'action',
        header: 'Action',
        cell: (info) => {
          const action = info.getValue() as string;
          const isUndone = info.row.original.undone_at !== null;
          return (
            <Flex
              className={styles.clickableCell}
              onClick={() => handleRowClick(info.row.original)}
            >
              {isUndone ? (
                <Badge variant="error">UNDONE</Badge>
              ) : (
                <Badge variant={actionBadgeVariant(action)}>{action}</Badge>
              )}
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
            <Flex
              className={styles.clickableCell}
              onClick={() => handleRowClick(info.row.original)}
            >
              <Text className={isUndone ? styles.mutedText : ''}>
                {formatEntityType(info.getValue() as string)} #{info.row.original.entity_id}
              </Text>
            </Flex>
          );
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Date',
        cell: (info) => (
          <Flex
            className={styles.clickableCell}
            onClick={() => handleRowClick(info.row.original)}
          >
            <Text color="muted">
              {formatTimestamp(new Date(info.getValue() as string))}
            </Text>
          </Flex>
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
          <Flex gap={3} align="center">
            <RotateCcw size={20} strokeWidth={2.5} />
            <Text variant="h4" as="span">
              {selectedEntity && `${formatEntityType(selectedEntity.type)} #${selectedEntity.id}`}
            </Text>
          </Flex>
        </Modal.Header>
        <Modal.Body>
          <Stack gap={0} className={styles.timeline}>
            {timelineEvents.map((event, i) => (
              <Flex key={event.key} gap={4} className={styles.timelineItem}>
                <Flex direction="column" align="center" className={styles.timelineTrack}>
                  <Flex
                    align="center"
                    justify="center"
                    className={`${styles.timelineDot} ${styles[`dot_${event.variant}`]}`}
                  />
                  {i < timelineEvents.length - 1 && (
                    <Flex className={styles.timelineConnector} />
                  )}
                </Flex>
                <Stack gap={2} className={styles.timelineContent}>
                  <Flex gap={2} align="center" wrap={true}>
                    <Badge variant={event.variant} size="sm">{event.label}</Badge>
                    <Text variant="caption" color="muted">
                      {formatTimestamp(event.timestamp)}
                    </Text>
                  </Flex>
                  {event.data && (
                    <ValueDisplay label={event.dataLabel} data={event.data} />
                  )}
                </Stack>
              </Flex>
            ))}
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Flex justify="flex-end">
            <Button variant="secondary" onClick={() => setSelectedEntity(null)}>
              Close
            </Button>
          </Flex>
        </Modal.Footer>
      </Modal>
    </Stack>
  );
}
