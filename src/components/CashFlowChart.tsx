'use client';

import { memo, useMemo } from 'react';
import * as d3 from 'd3';
import { Chart, Flex, Stack, Text, type RenderFrame } from 'doom-design-system';
// Behavior type matches doom's Chart behavior contract
type Behavior = (ctx: any) => (() => void) | void;
import { monthLabel, type CashFlowPeriod } from '@/lib/analytics';
import { ChartCard } from './ChartCard';

interface CashFlowChartProps {
  data: CashFlowPeriod[];
}

interface ChartDatum {
  period: string;
  type: string;
  amount: number;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

// Custom behavior: highlight hovered period's bars, dim others via chartStore subscription.
function highlightBar(): Behavior {
  return ({ getChartContext, getInteraction }: any) => {
    const ctx = getChartContext();
    if (!ctx?.g) return;
    const { g, chartStore } = ctx;

    const update = () => {
      const interaction = getInteraction('primary-hover');
      const targets = interaction?.targets || [];
      const allBars = g.selectAll('rect.bar-income, rect.bar-expenses');

      if (targets.length === 0) {
        allBars.style('opacity', 1);
        return;
      }

      const hovered = targets[0]?.data as ChartDatum | undefined;
      if (!hovered) return;

      allBars.style('opacity', function (this: any) {
        return d3.select(this).attr('data-period') === hovered.period ? 1 : 0.3;
      });
    };

    const unsubscribe = chartStore.subscribe(update);
    return () => {
      unsubscribe();
      g.selectAll('rect.bar-income, rect.bar-expenses').style('opacity', 1);
    };
  };
}

// Hoisted to stable identities: doom's Chart keys its hover wiring on the
// x/y/render/config/behaviors props, so new inline values on a parent re-render
// tear that wiring down (the highlight stops firing). See ornelasEduardo/doom#78.
const xAcc = (d: ChartDatum) => d.period;
const yAcc = (d: ChartDatum) => d.amount;
const D3_CONFIG = { showAxes: true, grid: true };
const BEHAVIORS = [highlightBar()];

function renderBars(frame: RenderFrame<ChartDatum>) {
  const { container, data: frameData, size } = frame;
  if (!frameData.length) return;

  const innerH = size.height;
  const periods = [...new Set(frameData.map((d) => d.period))];
  const x0 = d3.scaleBand().domain(periods).range([0, size.width]).padding(0.35);
  const x1 = d3.scaleBand().domain(['Income', 'Expenses']).range([0, x0.bandwidth()]).padding(0.1);
  const maxVal = d3.max(frameData, (d) => d.amount) ?? 0;
  const y = d3.scaleLinear().domain([0, maxVal * 1.1]).range([innerH, 0]);

  container.selectAll('.bar-income')
    .data(frameData.filter((d: ChartDatum) => d.type === 'Income'))
    .join('rect')
    .attr('class', 'bar-income')
    .attr('data-period', (d: ChartDatum) => d.period)
    .attr('x', (d: ChartDatum) => x0(d.period)! + x1('Income')!)
    .attr('y', (d: ChartDatum) => y(d.amount))
    .attr('width', x1.bandwidth())
    .attr('height', (d: ChartDatum) => innerH - y(d.amount))
    .attr('fill', 'var(--success)')
    .attr('stroke', 'var(--card-border)')
    .attr('stroke-width', 1.5)
    .attr('rx', 2);

  container.selectAll('.bar-expenses')
    .data(frameData.filter((d: ChartDatum) => d.type === 'Expenses'))
    .join('rect')
    .attr('class', 'bar-expenses')
    .attr('data-period', (d: ChartDatum) => d.period)
    .attr('x', (d: ChartDatum) => x0(d.period)! + x1('Expenses')!)
    .attr('y', (d: ChartDatum) => y(d.amount))
    .attr('width', x1.bandwidth())
    .attr('height', (d: ChartDatum) => innerH - y(d.amount))
    .attr('fill', 'var(--error)')
    .attr('stroke', 'var(--card-border)')
    .attr('stroke-width', 1.5)
    .attr('rx', 2);
}

// Memoized so the chart only re-renders when its data changes — never on
// unrelated AnalyticsOverview re-renders, which would tear down doom's hover.
const CashFlowChartBody = memo(function CashFlowChartBody({ chartData }: { chartData: ChartDatum[] }) {
  return (
    <div style={{ height: 300 }}>
      <Chart
        data={chartData}
        x={xAcc}
        y={yAcc}
        d3Config={D3_CONFIG}
        withFrame={false}
        flat
        style={{ width: '100%', height: '100%' }}
        behaviors={BEHAVIORS}
        render={renderBars}
      />
    </div>
  );
});

export function CashFlowChart({ data }: CashFlowChartProps) {
  const { chartData, totalNet, totalIncome, totalExpenses } = useMemo(() => {
    const cd: ChartDatum[] = data.flatMap((d) => [
      { period: monthLabel(d.period), type: 'Income', amount: d.income },
      { period: monthLabel(d.period), type: 'Expenses', amount: d.expenses },
    ]);
    return {
      chartData: cd,
      totalNet: data.reduce((sum, d) => sum + d.net, 0),
      totalIncome: data.reduce((sum, d) => sum + d.income, 0),
      totalExpenses: data.reduce((sum, d) => sum + d.expenses, 0),
    };
  }, [data]);

  const hasData = data.length > 0;

  const header = hasData ? (
    <Flex gap={4} align="baseline">
      <Stack gap={0}>
        <Text variant="caption" color="muted">Earned</Text>
        <Text weight="bold" variant="small" style={{ color: 'var(--success)' }}>{formatCurrency(totalIncome)}</Text>
      </Stack>
      <Stack gap={0}>
        <Text variant="caption" color="muted">Spent</Text>
        <Text weight="bold" variant="small" style={{ color: 'var(--error)' }}>{formatCurrency(totalExpenses)}</Text>
      </Stack>
      <Stack gap={0}>
        <Text variant="caption" color="muted">Net</Text>
        <Text weight="bold" variant="small" style={{ color: totalNet >= 0 ? 'var(--success)' : 'var(--error)' }}>
          {totalNet >= 0 ? '+' : ''}{formatCurrency(totalNet)}
        </Text>
      </Stack>
    </Flex>
  ) : undefined;

  return (
    <ChartCard
      title="Cash Flow"
      header={header}
      footer={!hasData && <Text color="muted" style={{ marginTop: -8 }}>No cash flow data for this period</Text>}
    >
      <CashFlowChartBody chartData={chartData} />
    </ChartCard>
  );
}
