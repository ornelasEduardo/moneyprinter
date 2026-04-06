'use client';

import * as d3 from 'd3';
import { Card, Chart, Flex, Stack, Text } from 'doom-design-system';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Tooltip } = require('doom-design-system/dist/components/Chart/behaviors') as { Tooltip: (opts?: any) => any };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DataHoverSensor } = require('doom-design-system/dist/components/Chart/sensors') as { DataHoverSensor: (opts?: any) => any };
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
  label: string;
}

export function CashFlowChart({ data }: CashFlowChartProps) {
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
    { period: formatPeriodLabel(d.period), type: 'Income', amount: d.income, label: `${formatPeriodLabel(d.period)} income: ${formatCurrency(d.income)}` },
    { period: formatPeriodLabel(d.period), type: 'Expenses', amount: d.expenses, label: `${formatPeriodLabel(d.period)} spent: ${formatCurrency(d.expenses)}` },
  ]);

  return (
    <Card>
      <Stack gap={4}>
        <Stack gap={2}>
          <Text variant="h5" weight="bold">Cash Flow</Text>
          <Flex gap={6} wrap align="baseline">
            <Stack gap={0}>
              <Text variant="caption" color="muted">Earned</Text>
              <Text weight="bold" style={{ color: 'var(--success)' }}>{formatCurrency(totalIncome)}</Text>
            </Stack>
            <Stack gap={0}>
              <Text variant="caption" color="muted">Spent</Text>
              <Text weight="bold" style={{ color: 'var(--error)' }}>{formatCurrency(totalExpenses)}</Text>
            </Stack>
            <Stack gap={0}>
              <Text variant="caption" color="muted">Net</Text>
              <Text weight="bold" style={{ color: totalNet >= 0 ? 'var(--success)' : 'var(--error)' }}>
                {totalNet >= 0 ? '+' : ''}{formatCurrency(totalNet)}
              </Text>
            </Stack>
          </Flex>
        </Stack>
        <div style={{ height: 300, minHeight: 200 }}>
          <Chart
            data={chartData}
            x={(d: ChartDatum) => d.period}
            y={(d: ChartDatum) => d.amount}
            behaviors={[Tooltip({ render: (d: ChartDatum) => d.label })]}
            sensors={[DataHoverSensor()]}
            d3Config={{ showAxes: true, grid: true }}
            withFrame={false}
            flat
            render={(frame) => {
              const { container, data: frameData, size, scales } = frame;
              if (!scales.x || !scales.y || !frameData.length) return;

              // d3 imported at top level
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
