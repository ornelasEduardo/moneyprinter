'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Table, Text } from 'doom-design-system';
import type { ColumnDef } from '@tanstack/react-table';
import { getPlanGoals, type PlanGoal } from '@/app/actions/planning';
import { tabForKind, amountLabelForKind } from '@/lib/planning/tools';
import { tabHref } from '@/lib/planning/nav';
import { money } from '@/lib/planning/format';

const fmtDate = (ms: number) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(ms));

const BUCKETS = ['Today', 'This week', 'This month', 'Earlier'] as const;
function bucketOf(ms: number, now: number): (typeof BUCKETS)[number] {
  const days = Math.floor((now - ms) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days <= 7) return 'This week';
  if (days <= 31) return 'This month';
  return 'Earlier';
}

type Row = { id: number; name: string; kind: string; downPayment: number; createdAt: number; period: string };

export default function PlanGoalsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [goals, setGoals] = useState<PlanGoal[] | null>(null);

  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPlanGoals()
      .then((g) => { if (!cancelled) setGoals(g); })
      .catch(() => { if (!cancelled) { setError(true); setGoals([]); } });
    return () => {
      cancelled = true;
    };
  }, []);

  const viewPlan = useCallback(
    (id: number, kind: string) => router.push(tabHref(searchParams, tabForKind(kind), id)),
    [router, searchParams],
  );

  const rows = useMemo<Row[]>(() => {
    if (!goals) return [];
    const now = Date.now();
    return goals
      .map((g) => ({ id: g.id, name: g.name, kind: g.kind, downPayment: g.targetAmount, createdAt: g.createdAt, period: bucketOf(g.createdAt, now) }))
      .sort((a, b) => b.createdAt - a.createdAt); // newest first
  }, [goals]);

  // Registry-driven so a future non-mortgage plan kind labels its amount correctly.
  const amountHeader = amountLabelForKind(rows[0]?.kind ?? 'mortgage');

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      { accessorKey: 'createdAt', header: 'Saved', cell: (i) => <Text weight="medium">{fmtDate(i.getValue() as number)}</Text> },
      { accessorKey: 'period', header: 'Group' },
      { accessorKey: 'name', header: 'Plan', cell: (i) => <Text weight="bold">{i.getValue() as string}</Text> },
      { accessorKey: 'downPayment', header: amountHeader, cell: (i) => <Text>{money(i.getValue() as number)}</Text> },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <Button size="sm" variant="primary" data-testid="pg-view-plan" onClick={() => viewPlan(row.original.id, row.original.kind)}>
            View plan
          </Button>
        ),
      },
    ],
    [viewPlan, amountHeader],
  );

  if (error) {
    return <Text color="muted" data-testid="plan-goals-list">Couldn&apos;t load your saved plans.</Text>;
  }
  if (goals == null) {
    return <Text color="muted" data-testid="plan-goals-list">Loading…</Text>;
  }
  if (goals.length === 0) {
    return <Text color="muted" data-testid="plan-goals-list">No saved plans yet — save a strategy to track it here.</Text>;
  }

  return (
    <div data-testid="plan-goals-list">
      <Table
        data={rows}
        columns={columns}
        enableFiltering
        enableSorting
        density="compact"
        filters={[{ columnId: 'period', label: 'Group', type: 'select', options: BUCKETS.map((b) => ({ value: b, label: b })) }]}
      />
    </div>
  );
}
