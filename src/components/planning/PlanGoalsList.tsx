'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Table, Text } from 'doom-design-system';
import type { ColumnDef } from '@tanstack/react-table';
import { getPlanGoals } from '@/app/actions/planning';

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const fmtDate = (ms: number) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(ms));

// Coarse date buckets for the "Group" column + its filter, so plans cluster by
// when they were saved (Today / This week / This month / Earlier).
const BUCKETS = ['Today', 'This week', 'This month', 'Earlier'] as const;
function bucketOf(ms: number, now: number): (typeof BUCKETS)[number] {
  const days = Math.floor((now - ms) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days <= 7) return 'This week';
  if (days <= 31) return 'This month';
  return 'Earlier';
}

type PlanGoal = Awaited<ReturnType<typeof getPlanGoals>>[number];
type Row = { id: number; name: string; downPayment: number; createdAt: number; period: string };

// Drawer contents: saved plans as a searchable, date-grouped table. "View plan"
// reuses GoalTracker's /?tab=mortgage&goal=<id> reopen idiom, cloning current
// params so other query state survives the jump.
export default function PlanGoalsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [goals, setGoals] = useState<PlanGoal[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPlanGoals().then((g) => {
      if (!cancelled) setGoals(g);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const viewPlan = useCallback(
    (id: number) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set('tab', 'mortgage');
      p.set('goal', String(id));
      router.push('/?' + p.toString());
    },
    [router, searchParams],
  );

  const rows = useMemo<Row[]>(() => {
    if (!goals) return [];
    const now = Date.now();
    return goals
      .map((g) => ({ id: g.id, name: g.name, downPayment: g.targetAmount, createdAt: g.createdAt, period: bucketOf(g.createdAt, now) }))
      .sort((a, b) => b.createdAt - a.createdAt); // newest first
  }, [goals]);

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      { accessorKey: 'createdAt', header: 'Saved', cell: (i) => <Text weight="medium">{fmtDate(i.getValue() as number)}</Text> },
      { accessorKey: 'period', header: 'Group' },
      { accessorKey: 'name', header: 'Plan', cell: (i) => <Text weight="bold">{i.getValue() as string}</Text> },
      { accessorKey: 'downPayment', header: 'Down payment', cell: (i) => <Text>{money(i.getValue() as number)}</Text> },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <Button size="sm" variant="primary" data-testid="pg-view-plan" onClick={() => viewPlan(row.original.id)}>
            View plan
          </Button>
        ),
      },
    ],
    [viewPlan],
  );

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
