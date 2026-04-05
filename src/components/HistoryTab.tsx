'use client';

import { useMemo, useState, useTransition } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Button, Card, Checkbox, Text, Stack, Badge, Flex, Table, Modal, Sheet } from 'doom-design-system';
import { undoEntry, undoEntryBatch } from '@/app/actions/audit';
import { Undo2, RotateCcw } from 'lucide-react';
import type { IntegrityWarning } from '@/lib/integrity';
import styles from './HistoryTab.module.scss';

// ── Types ────────────────────────────────────────────────

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

interface DisplayRow {
  type: 'single' | 'batch';
  id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  batch_id: string | null;
  created_at: string;
  undone_at: string | null;
  count: number;
  entries: AuditEntryRow[];
}

interface TimelineEvent {
  key: string;
  label: string;
  variant: 'success' | 'warning' | 'error' | 'secondary';
  timestamp: Date;
  data: Record<string, unknown> | null;
  dataLabel: string;
}

// ── Formatters ───────────────────────────────────────────

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
    if (Number.isFinite(value) && value.toString().includes('.')) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    }
    return value.toLocaleString();
  }
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return value;
  }
  return String(value);
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const formatTimestamp = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const formatShortDate = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// ── Data helpers ─────────────────────────────────────────

function entryValue(entry: AuditEntryRow, key: string): unknown {
  return (entry.new_value as any)?.[key] ?? (entry.previous_value as any)?.[key];
}

function groupEntries(entries: AuditEntryRow[]): DisplayRow[] {
  const batches = new Map<string, AuditEntryRow[]>();
  const singles: AuditEntryRow[] = [];

  for (const entry of entries) {
    if (entry.batch_id) {
      const group = batches.get(entry.batch_id);
      if (group) group.push(entry);
      else batches.set(entry.batch_id, [entry]);
    } else {
      singles.push(entry);
    }
  }

  const rows: DisplayRow[] = [];

  for (const [batchId, group] of batches) {
    const first = group[0];
    const allUndone = group.every((e) => e.undone_at !== null);
    rows.push({
      type: 'batch',
      id: first.id,
      action: first.action,
      entity_type: first.entity_type,
      entity_id: first.entity_id,
      batch_id: batchId,
      created_at: first.created_at,
      undone_at: allUndone ? first.undone_at : null,
      count: group.length,
      entries: group,
    });
  }

  for (const entry of singles) {
    rows.push({
      type: 'single',
      id: entry.id,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      batch_id: null,
      created_at: entry.created_at,
      undone_at: entry.undone_at,
      count: 1,
      entries: [entry],
    });
  }

  return rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function buildTimelineEvents(entry: AuditEntryRow): TimelineEvent[] {
  const events: TimelineEvent[] = [];

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

  events.push({
    key: `${entry.id}-original`,
    label: entry.action,
    variant: actionBadgeVariant(entry.action),
    timestamp: new Date(entry.created_at),
    data: entry.action === 'CREATE' ? entry.new_value
        : entry.action === 'DELETE' ? entry.previous_value
        : entry.new_value,
    dataLabel: entry.action === 'DELETE' ? 'Deleted record' : '',
  });

  return events;
}

// ── Sub-components ───────────────────────────────────────

function ValueDisplay({ label, data }: { label: string; data: Record<string, unknown> }) {
  const fields = Object.entries(data).filter(
    ([key]) => !['id', 'user_id', 'deleted_at'].includes(key)
  );
  if (fields.length === 0) return null;

  return (
    <Stack gap={1}>
      {label && <Text variant="caption" weight="semibold" className="uppercase">{label}</Text>}
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

function IntegrityWarnings({ warnings }: { warnings: IntegrityWarning[] }) {
  if (warnings.length === 0) return null;
  return (
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
  );
}

function EntityTimeline({
  entity,
  events,
  onClose,
}: {
  entity: { type: string; id: number } | null;
  events: TimelineEvent[];
  onClose: () => void;
}) {
  return (
    <Modal isOpen={entity !== null} onClose={onClose}>
      <Modal.Header>
        <Flex gap={3} align="center">
          <RotateCcw size={20} strokeWidth={2.5} />
          <Text variant="h4" as="span">
            {entity && `${formatEntityType(entity.type)} #${entity.id}`}
          </Text>
        </Flex>
      </Modal.Header>
      <Modal.Body>
        <Stack gap={0} className={styles.timeline}>
          {events.map((event, i) => (
            <Flex key={event.key} gap={4} className={styles.timelineItem}>
              <Flex direction="column" align="center" className={styles.timelineTrack}>
                <Flex
                  align="center"
                  justify="center"
                  className={`${styles.timelineDot} ${styles[`dot_${event.variant}`]}`}
                />
                {i < events.length - 1 && <Flex className={styles.timelineConnector} />}
              </Flex>
              <Stack gap={2} className={styles.timelineContent}>
                <Flex gap={2} align="center" wrap={true}>
                  <Badge variant={event.variant} size="sm">{event.label}</Badge>
                  <Text variant="caption" color="muted">{formatTimestamp(event.timestamp)}</Text>
                </Flex>
                {event.data && <ValueDisplay label={event.dataLabel} data={event.data} />}
              </Stack>
            </Flex>
          ))}
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Flex justify="flex-end">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </Flex>
      </Modal.Footer>
    </Modal>
  );
}

// ── Column builders ──────────────────────────────────────

function buildBatchColumns(
  allUndone: boolean,
  selectedBatch: DisplayRow | null,
  selectedEntryIds: Set<number>,
  setSelectedEntryIds: React.Dispatch<React.SetStateAction<Set<number>>>,
): ColumnDef<AuditEntryRow>[] {
  const firstCol: ColumnDef<AuditEntryRow> = allUndone
    ? {
        id: 'status',
        header: 'Status',
        cell: () => <Badge variant="error" size="sm">undone</Badge>,
        size: 80,
      }
    : {
        id: 'select',
        header: () => {
          if (!selectedBatch) return null;
          const undoable = selectedBatch.entries.filter((e) => !e.undone_at);
          const allSelected = undoable.length > 0 && undoable.every((e) => selectedEntryIds.has(e.id));
          return (
            <Checkbox
              checked={allSelected}
              onChange={() => {
                setSelectedEntryIds(allSelected ? new Set() : new Set(undoable.map((e) => e.id)));
              }}
            />
          );
        },
        cell: (info) => {
          const entry = info.row.original;
          if (entry.undone_at) return <Badge variant="error" size="sm">undone</Badge>;
          return (
            <Checkbox
              checked={selectedEntryIds.has(entry.id)}
              onChange={() => {
                setSelectedEntryIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(entry.id)) next.delete(entry.id);
                  else next.add(entry.id);
                  return next;
                });
              }}
            />
          );
        },
        size: 48,
      };

  return [
    firstCol,
    {
      id: 'name',
      header: 'Description',
      cell: (info) => {
        const entry = info.row.original;
        const name = entryValue(entry, 'name') as string || '';
        return (
          <Text variant="small" className={entry.undone_at ? styles.mutedText : ''}>
            {name || `${formatEntityType(entry.entity_type)} #${entry.entity_id}`}
          </Text>
        );
      },
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: (info) => {
        const amount = entryValue(info.row.original, 'amount') as number | undefined;
        if (amount === undefined) return null;
        return <Text variant="small" color="muted">{formatCurrency(Number(amount))}</Text>;
      },
    },
    {
      id: 'date',
      header: 'Date',
      cell: (info) => {
        const date = entryValue(info.row.original, 'date') as string | undefined;
        if (!date) return null;
        return <Text variant="small" color="muted">{formatShortDate(new Date(date))}</Text>;
      },
    },
  ];
}

function buildActivityColumns(
  isPending: boolean,
  onBatchClick: (row: DisplayRow) => void,
  onEntityClick: (entry: AuditEntryRow) => void,
  onUndo: (row: DisplayRow) => void,
): ColumnDef<DisplayRow>[] {
  return [
    {
      accessorKey: 'action',
      header: 'Action',
      cell: (info) => {
        const row = info.row.original;
        const isUndone = row.undone_at !== null;
        if (row.type === 'batch') {
          return isUndone
            ? <Badge variant="error">UNDONE</Badge>
            : <Badge variant="success">IMPORT</Badge>;
        }
        return isUndone
          ? <Badge variant="error">UNDONE</Badge>
          : <Badge variant={actionBadgeVariant(row.action)}>{row.action}</Badge>;
      },
    },
    {
      accessorKey: 'entity_type',
      header: 'Details',
      cell: (info) => {
        const row = info.row.original;
        const isUndone = row.undone_at !== null;
        if (row.type === 'batch') {
          return (
            <Flex className={styles.clickableCell} onClick={() => onBatchClick(row)}>
              <Text className={isUndone ? styles.mutedText : ''}>
                Imported {row.count} {formatEntityType(row.entity_type)}
              </Text>
            </Flex>
          );
        }
        return (
          <Flex className={styles.clickableCell} onClick={() => onEntityClick(row.entries[0])}>
            <Text className={isUndone ? styles.mutedText : ''}>
              {formatEntityType(row.entity_type)} #{row.entity_id}
            </Text>
          </Flex>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Date',
      cell: (info) => (
        <Text color="muted">{formatTimestamp(new Date(info.getValue() as string))}</Text>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: (info) => {
        const row = info.row.original;
        if (row.undone_at !== null) return null;
        return (
          <Flex justify="flex-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onUndo(row); }}
              disabled={isPending}
              aria-label="Undo"
            >
              <Undo2 size={14} strokeWidth={2.5} />
              {row.type === 'batch' ? `Undo all ${row.count}` : 'Undo'}
            </Button>
          </Flex>
        );
      },
    },
  ];
}

// ── Main component ───────────────────────────────────────

export default function HistoryTab({ entries, warnings }: HistoryTabProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedEntity, setSelectedEntity] = useState<{ type: string; id: number } | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<DisplayRow | null>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<number>>(new Set());

  const displayRows = useMemo(() => groupEntries(entries), [entries]);
  const batchAllUndone = selectedBatch?.undone_at !== null;

  const timelineEvents = useMemo(() => {
    if (!selectedEntity) return [];
    return entries
      .filter((e) => e.entity_type === selectedEntity.type && e.entity_id === selectedEntity.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .flatMap(buildTimelineEvents);
  }, [selectedEntity, entries]);

  const batchColumns = useMemo(
    () => buildBatchColumns(batchAllUndone, selectedBatch, selectedEntryIds, setSelectedEntryIds),
    [selectedBatch, selectedEntryIds, batchAllUndone],
  );

  const handleUndo = (row: DisplayRow) => {
    startTransition(async () => {
      if (row.type === 'batch' && row.batch_id) {
        await undoEntryBatch(row.batch_id);
      } else {
        await undoEntry(row.id);
      }
    });
  };

  const handleBatchClick = (row: DisplayRow) => {
    setSelectedBatch(row);
    setSelectedEntryIds(new Set(row.entries.filter((e) => !e.undone_at).map((e) => e.id)));
  };

  const columns = useMemo(
    () => buildActivityColumns(isPending, handleBatchClick, (e) => setSelectedEntity({ type: e.entity_type, id: e.entity_id }), handleUndo),
    [isPending, entries],
  );

  const handleBatchUndo = () => {
    if (!selectedBatch) return;
    const undoable = selectedBatch.entries.filter((e) => !e.undone_at);
    const allSelected = undoable.length === selectedEntryIds.size;
    startTransition(async () => {
      if (allSelected && selectedBatch.batch_id) {
        await undoEntryBatch(selectedBatch.batch_id);
      } else {
        for (const id of selectedEntryIds) {
          await undoEntry(id);
        }
      }
      setSelectedBatch(null);
    });
  };

  return (
    <Stack gap={4}>
      <IntegrityWarnings warnings={warnings} />

      <Card className={styles.cardInner}>
        <Stack gap={4}>
          <Text variant="h4">Activity Log</Text>
          {entries.length === 0 ? (
            <Text color="muted">No activity yet.</Text>
          ) : (
            <Table
              data={displayRows}
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

      <EntityTimeline
        entity={selectedEntity}
        events={timelineEvents}
        onClose={() => setSelectedEntity(null)}
      />

      <Sheet
        isOpen={selectedBatch !== null}
        onClose={() => setSelectedBatch(null)}
        title={<Text variant="h5" as="h1">Select rows to undo...</Text>}
        footer={
          selectedBatch && !batchAllUndone && (
            <Flex justify="flex-end">
              <Button
                disabled={isPending || selectedEntryIds.size === 0}
                onClick={handleBatchUndo}
              >
                <Undo2 size={14} strokeWidth={2.5} />
                Undo {selectedEntryIds.size} {selectedEntryIds.size === 1 ? 'transaction' : 'transactions'}
              </Button>
            </Flex>
          )
        }
      >
        <Sheet.Body>
          {selectedBatch && (
            <Table
              data={selectedBatch.entries}
              columns={batchColumns}
              variant="flat"
              height={400}
              enablePagination={selectedBatch.entries.length > 20}
              pageSize={20}
            />
          )}
        </Sheet.Body>
      </Sheet>
    </Stack>
  );
}
