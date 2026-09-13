'use client';

import { useMemo, useRef, useState } from 'react';
import { Button, Input, Text } from 'doom-design-system';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { money } from '@/lib/planning/format';
import type { StreamSuggestion } from '@/lib/llm/useCategorizationStream';
import styles from './CategorizationWorkspace.module.scss';

// Suggestions at/above this confidence are safe to bulk-apply with a glance;
// below it, the row wants a human eye. This threshold is the triage lever.
const HIGH = 0.85;
const NUMERIC = { fontVariantNumeric: 'tabular-nums' as const };

interface Group {
  category: string;
  rows: StreamSuggestion[];
  avg: number;
}

// One flat list drives a single virtualizer: group headers and their rows are
// interleaved so 1000 suggestions render ~20 DOM nodes, not 1000.
type Row = { kind: 'header'; group: Group } | { kind: 'row'; row: StreamSuggestion };

export interface CategorizationWorkspaceProps {
  rows: StreamSuggestion[];
  streaming: boolean;
  progress: { done: number; total: number };
  busy: boolean;
  onApply: (items: { id: number; tag: string }[]) => void;
  onDismiss: () => void;
  onCancel: () => void;
}

export default function CategorizationWorkspace({
  rows,
  streaming,
  progress,
  busy,
  onApply,
  onDismiss,
  onCancel,
}: CategorizationWorkspaceProps) {
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const tagOf = (r: StreamSuggestion) => edits[r.id] ?? r.category;

  // Group by the model's suggested category (stable — an edit never moves a row
  // between groups), biggest group first; within a group show lowest-confidence
  // rows first so the ones needing scrutiny surface at the top.
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, StreamSuggestion[]>();
    for (const r of rows) {
      const arr = map.get(r.category) ?? [];
      arr.push(r);
      map.set(r.category, arr);
    }
    const gs = Array.from(map, ([category, rs]) => ({
      category,
      rows: [...rs].sort((a, b) => a.confidence - b.confidence),
      avg: rs.reduce((s, r) => s + r.confidence, 0) / rs.length,
    }));
    gs.sort((a, b) => b.rows.length - a.rows.length);
    return gs;
  }, [rows]);

  const items = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const g of groups) {
      out.push({ kind: 'header', group: g });
      if (!collapsed.has(g.category)) for (const row of g.rows) out.push({ kind: 'row', row });
    }
    return out;
  }, [groups, collapsed]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => (items[i].kind === 'header' ? 52 : 68),
    overscan: 10,
  });

  const highRows = useMemo(() => rows.filter((r) => r.confidence >= HIGH), [rows]);

  const toggle = (cat: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });

  const applyRows = (rs: StreamSuggestion[]) => {
    const items = rs.map((r) => ({ id: r.id, tag: tagOf(r) })).filter((i) => i.tag.trim());
    if (items.length) onApply(items);
  };

  const empty = !streaming && rows.length === 0;

  return (
    <div className={styles.workspace} data-testid="llm-workspace">
      <div className={styles.top}>
        <div className={styles.topCopy}>
          <Text as="p" weight="bold" className={styles.topTitle}>Review categories</Text>
          <Text as="p" variant="caption" color="muted" className={styles.topSub}>
            {streaming
              ? `Categorizing ${progress.done} of ${progress.total} locally…`
              : empty
                ? 'All caught up — every transaction is categorized.'
                : `${rows.length} suggestion${rows.length === 1 ? '' : 's'} across ${groups.length} categor${groups.length === 1 ? 'y' : 'ies'} · ${highRows.length} high-confidence`}
          </Text>
        </div>
        <div className={styles.topActions}>
          {highRows.length > 0 && (
            <Button
              size="sm"
              variant="primary"
              disabled={busy}
              onClick={() => applyRows(highRows)}
              data-testid="llm-apply-high"
            >
              Apply {highRows.length} high-confidence
            </Button>
          )}
          {streaming ? (
            <Button size="sm" variant="ghost" onClick={onCancel}>Stop</Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={onDismiss}>Dismiss</Button>
          )}
        </div>
      </div>

      {streaming && (
        <div className={styles.progress} role="progressbar" aria-valuenow={progress.done} aria-valuemin={0} aria-valuemax={progress.total}>
          <div
            className={styles.progressFill}
            style={{ width: progress.total ? `${Math.round((progress.done / progress.total) * 100)}%` : '0%' }}
          />
        </div>
      )}

      {!empty && (
        <div className={styles.scroll} ref={scrollRef}>
          <div className={styles.canvas} style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((v) => {
              const item = items[v.index];
              return (
                <div
                  key={v.key}
                  data-index={v.index}
                  ref={virtualizer.measureElement}
                  className={styles.slot}
                  style={{ transform: `translateY(${v.start}px)` }}
                >
                  {item.kind === 'header' ? (
                    <GroupHeader
                      group={item.group}
                      open={!collapsed.has(item.group.category)}
                      busy={busy}
                      onToggle={() => toggle(item.group.category)}
                      onApply={() => applyRows(item.group.rows)}
                    />
                  ) : (
                    <RowSlat
                      row={item.row}
                      value={tagOf(item.row)}
                      busy={busy}
                      onEdit={(val) => setEdits((s) => ({ ...s, [item.row.id]: val }))}
                      onApply={() => applyRows([item.row])}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function GroupHeader({
  group,
  open,
  busy,
  onToggle,
  onApply,
}: {
  group: Group;
  open: boolean;
  busy: boolean;
  onToggle: () => void;
  onApply: () => void;
}) {
  const avg = Math.round(group.avg * 100);
  return (
    <div className={styles.group} data-testid="llm-group">
      <button type="button" className={styles.groupToggle} onClick={onToggle} aria-expanded={open}>
        {open ? <ChevronDown size={16} strokeWidth={2.5} /> : <ChevronRight size={16} strokeWidth={2.5} />}
        <span className={styles.groupName}>{group.category}</span>
        <span className={styles.groupMeta} style={NUMERIC}>
          {group.rows.length} · avg {avg}%
        </span>
      </button>
      <Button size="sm" variant="secondary" disabled={busy} onClick={onApply}>
        Apply {group.rows.length}
      </Button>
    </div>
  );
}

function RowSlat({
  row,
  value,
  busy,
  onEdit,
  onApply,
}: {
  row: StreamSuggestion;
  value: string;
  busy: boolean;
  onEdit: (val: string) => void;
  onApply: () => void;
}) {
  const conf = Math.round(row.confidence * 100);
  const tier = conf >= 85 ? styles.high : conf >= 60 ? styles.medium : styles.low;
  return (
    <div className={styles.row} data-testid="llm-slat">
      <div className={styles.txn}>
        <Text as="p" weight="bold" className={styles.name}>{row.name}</Text>
        <Text as="p" variant="caption" color="muted" className={styles.amount} style={NUMERIC}>
          {money(row.amount)}
        </Text>
      </div>
      <span className={`${styles.conf} ${tier}`} title={`${conf}% confidence`}>{conf}%</span>
      <Input aria-label={`Category for ${row.name}`} value={value} onChange={(e) => onEdit(e.target.value)} className={styles.cat} />
      <Button size="sm" variant="primary" disabled={busy} onClick={onApply}>Apply</Button>
    </div>
  );
}
