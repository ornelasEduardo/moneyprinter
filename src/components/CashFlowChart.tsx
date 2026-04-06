'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { Card, Chart, Flex, Stack, Text } from 'doom-design-system';
// Behavior type matches doom's Chart behavior contract
type Behavior = (ctx: any) => (() => void) | void;
import type { CashFlowPeriod } from '@/lib/analytics';

interface CashFlowChartProps {
  data: CashFlowPeriod[];
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

function formatPeriodLabel(period: string): string {
  const [year, month] = period.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short' });
}

interface ChartDatum {
  period: string;
  type: string;
  amount: number;
}

// Custom behavior: highlight hovered period's bars, dim others via chartStore subscription
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

export function CashFlowChart({ data }: CashFlowChartProps) {
  const behaviors = useMemo(() => [highlightBar()], []);

  if (data.length === 0) {
    return (
      <Card>
        <Stack gap={3}>
          <Text variant="h5" weight="bold">Cash Flow</Text>
          <Text color="muted">No cash flow data for this period</Text>
        </Stack>
      </Card>
    );
  }

  const totalNet = data.reduce((sum, d) => sum + d.net, 0);
  const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
  const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0);

  const chartData: ChartDatum[] = data.flatMap((d) => [
    { period: formatPeriodLabel(d.period), type: 'Income', amount: d.income },
    { period: formatPeriodLabel(d.period), type: 'Expenses', amount: d.expenses },
  ]);

  return (
    <Card>
      <Stack gap={4}>
        <Text variant="h5" weight="bold">Cash Flow</Text>
        <div style={{ height: 300 }}>
          <Chart
            data={chartData}
            x={(d: ChartDatum) => d.period}
            y={(d: ChartDatum) => d.amount}
            d3Config={{ showAxes: true, grid: true }}
            withFrame={false}
            flat
            style={{ width: '100%', height: '100%' }}
            behaviors={behaviors}
            render={(frame) => {
              const { container, data: frameData, size } = frame;
              if (!frameData.length) return;

              const innerH = size.height;
              const periods = [...new Set(frameData.map((d: ChartDatum) => d.period))];
              const x0 = d3.scaleBand().domain(periods).range([0, size.width]).padding(0.35);
              const x1 = d3.scaleBand().domain(['Income', 'Expenses']).range([0, x0.bandwidth()]).padding(0.1);
              const maxVal = d3.max(frameData, (d: ChartDatum) => d.amount) ?? 0;
              const y = d3.scaleLinear().domain([0, maxVal * 1.1]).range([innerH, 0]);

              // Income bars
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

              // Expense bars
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
            }}
          />
        </div>
      </Stack>
    </Card>
  );
}
