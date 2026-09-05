'use client';

import { memo, useMemo, useState } from 'react';
import { curveMonotoneX } from 'd3-shape';
import { Chart, Text, Flex, ToggleGroup, ToggleGroupItem } from 'doom-design-system';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { ProjectedPoint, ProjectionMode, NetWorthPoint } from '@/lib/projection';
import { monthKey, monthLabel } from '@/lib/analytics';
import { ChartCard } from './ChartCard';
import styles from './NetWorthTrend.module.scss';

interface NetWorthTrendProps {
  data: NetWorthPoint[];
  projections: { regression: ProjectedPoint[]; savingsRate: ProjectedPoint[] };
}

interface SeriesDatum {
  label: string;
  netWorth: number;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

// Collapse a dated series to one representative point per month (last value in
// each month), preserving chronological order. Monthly granularity keeps the
// x-axis readable: doom builds a scalePoint for string x-values and renders a
// tick for EVERY point (it ignores .ticks() on point scales), so daily/weekly
// data would produce ~40 overlapping labels.
function toMonthly(points: { date: string; netWorth: number }[]): SeriesDatum[] {
  const byMonth = new Map<string, { date: string; netWorth: number }>();
  for (const p of points) byMonth.set(monthKey(p.date), p); // later dates overwrite -> last wins
  return Array.from(byMonth.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({ label: monthLabel(p.date), netWorth: p.netWorth }));
}

// Hoisted to stable identities: doom's Chart keys its hover wiring on the
// x/y/data/config props, so new inline values on a parent re-render tear that
// wiring down. See ornelasEduardo/doom#78.
const xAcc = (d: SeriesDatum) => d.label;
const yAcc = (d: SeriesDatum) => d.netWorth;
const CHART_CONFIG = { grid: true, showDots: true, curve: curveMonotoneX };

// Memoized on its inputs so it only re-renders when the series data actually
// changes — never on unrelated AnalyticsOverview re-renders (loading flips,
// filter changes, sibling-chart hovers), which would tear down doom's hover.
const NetWorthChartBody = memo(function NetWorthChartBody({
  allPoints,
  history,
  projection,
}: {
  allPoints: SeriesDatum[];
  history: SeriesDatum[];
  projection: SeriesDatum[];
}) {
  return (
    <Chart.Root
      data={allPoints}
      x={xAcc}
      y={yAcc}
      type="line"
      d3Config={CHART_CONFIG}
      withLegend
      style={{ width: '100%', height: 240 }}
    >
      <Chart.Series type="line" data={history} label="History" color="var(--primary)" x={xAcc} y={yAcc} />
      <Chart.Series
        type="line"
        data={projection}
        label="Projection"
        color="var(--secondary)"
        className={styles.projection}
        x={xAcc}
        y={yAcc}
      />
    </Chart.Root>
  );
});

export function NetWorthTrend({ data, projections }: NetWorthTrendProps) {
  const [mode, setMode] = useState<ProjectionMode>('regression');

  const hasHistory = data.length >= 2;

  // Memoize the derived series so their array identities stay stable across
  // re-renders that don't change the underlying data/mode.
  const { history, projection, allPoints } = useMemo(() => {
    const hist = toMonthly(data);
    const projected = mode === 'regression' ? projections.regression : projections.savingsRate;
    const projMonthly = toMonthly(projected);
    const lastPt = hist[hist.length - 1];
    // Anchor the projection to the last actual point so the two series connect.
    const proj: SeriesDatum[] = lastPt ? [lastPt, ...projMonthly] : projMonthly;
    // Combined set drives the chart's shared x/y scale domains so both series fit.
    const all: SeriesDatum[] = [...hist, ...proj.slice(1)];
    return { history: hist, projection: proj, allPoints: all };
  }, [data, projections, mode]);

  const latest = hasHistory ? data[data.length - 1].netWorth : 0;
  const earliest = hasHistory ? data[0].netWorth : 0;
  const change = latest - earliest;
  const isUp = change >= 0;

  const header = hasHistory ? (
    <Flex align="center" gap={3}>
      <Flex align="center" gap={2}>
        {isUp
          ? <TrendingUp size={14} strokeWidth={2.5} style={{ color: 'var(--success)' }} />
          : <TrendingDown size={14} strokeWidth={2.5} style={{ color: 'var(--error)' }} />}
        <Text
          variant="small"
          weight="bold"
          style={{ color: isUp ? 'var(--success)' : 'var(--error)' }}
          data-testid="delta-readout"
        >
          {isUp ? '+' : ''}{formatCurrency(change)} · {formatCurrency(latest)}
        </Text>
      </Flex>
      <ToggleGroup
        type="single"
        value={mode}
        onValueChange={(v) => { if (v) setMode(v as ProjectionMode); }}
        size="sm"
        aria-label="Projection mode"
      >
        <ToggleGroupItem value="regression">Trend</ToggleGroupItem>
        <ToggleGroupItem value="savings-rate">Savings rate</ToggleGroupItem>
      </ToggleGroup>
    </Flex>
  ) : undefined;

  return (
    <ChartCard
      title="Net Worth"
      header={header}
      footer={!hasHistory && (
        <Text color="muted" style={{ marginTop: -8 }}>
          Not enough net worth history to chart a trend yet.
        </Text>
      )}
    >
      <NetWorthChartBody allPoints={allPoints} history={history} projection={projection} />
    </ChartCard>
  );
}
