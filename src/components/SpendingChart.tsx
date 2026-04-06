'use client';

import { useState } from 'react';
import * as d3 from 'd3';
import { Card, Chart, Flex, Stack, Switcher, Text } from 'doom-design-system';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Dim } = require('doom-design-system/dist/components/Chart/behaviors') as { Dim: (opts?: any) => any };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DataHoverSensor } = require('doom-design-system/dist/components/Chart/sensors') as { DataHoverSensor: (opts?: any) => any };
import type { CategorySpending } from '@/lib/analytics';

const COLORS = [
  'var(--primary)',
  'var(--secondary)',
  'var(--success)',
  'var(--warning)',
  'var(--error)',
  'var(--accent)',
  'var(--muted)',
];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

interface SpendingChartProps {
  data: CategorySpending[];
  total: number;
}

export function SpendingChart({ data, total }: SpendingChartProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const size = 160;

  if (data.length === 0) {
    return (
      <Card>
        <Stack gap={3}>
          <Text variant="h5" weight="bold">Spending by Category</Text>
          <Text color="muted">No spending data for this period</Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Card>
      <Stack gap={4}>
        <Text variant="h5" weight="bold">Spending by Category</Text>
        <Switcher threshold="md" gap={4} align="center">
          <Flex justify="center" style={{ width: '100%' }}>
            <div style={{ width: size, height: size }}>
              <Chart
                data={data}
                x={(d: CategorySpending) => d.category}
                y={(d: CategorySpending) => d.amount}
                behaviors={[Dim({ opacity: 0.3 })]}
                sensors={[DataHoverSensor()]}
                d3Config={{ showAxes: false, grid: false }}
                withFrame={false}
                flat
                onValueChange={(d) => setHoveredCategory(d ? (d as CategorySpending).category : null)}
                render={(frame) => {
                  const { container, data: frameData, size: chartSize } = frame;
                  if (!frameData.length) return;

                  // d3 imported at top level
                  const radius = Math.min(chartSize.width, chartSize.height) / 2;
                  const innerRadius = radius * 0.6;
                  const cx = chartSize.width / 2;
                  const cy = chartSize.height / 2;

                  const g = container.selectAll('.donut-group').data([null]).join('g')
                    .attr('class', 'donut-group')
                    .attr('transform', `translate(${cx},${cy})`);

                  const pie = d3.pie<CategorySpending>().value((d: CategorySpending) => d.amount).sort(null);
                  const arc = d3.arc<d3.PieArcDatum<CategorySpending>>()
                    .innerRadius(innerRadius)
                    .outerRadius(radius - 2);

                  g.selectAll('path')
                    .data(pie(frameData as CategorySpending[]))
                    .join('path')
                    .attr('d', arc)
                    .attr('fill', (_: unknown, i: number) => COLORS[i % COLORS.length])
                    .attr('stroke', 'var(--card-bg)')
                    .attr('stroke-width', 2)
                    .attr('data-chart-type', 'donut')
                    .attr('data-chart-index', (_: unknown, i: number) => i);

                  // Center text
                  g.selectAll('.center-text').data([null]).join('text')
                    .attr('class', 'center-text')
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .attr('font-size', '16px')
                    .attr('font-weight', '700')
                    .attr('fill', 'var(--foreground)')
                    .text(formatCurrency(total));
                }}
              />
            </div>
          </Flex>
          <Stack gap={1} style={{ flex: 1, width: '100%' }}>
            {data.slice(0, 8).map((cat, i) => (
              <Flex
                key={cat.category}
                align="center"
                gap={2}
                style={{
                  padding: '2px 0',
                  opacity: hoveredCategory && hoveredCategory !== cat.category ? 0.3 : 1,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={() => setHoveredCategory(cat.category)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: COLORS[i % COLORS.length],
                  flexShrink: 0,
                }} />
                <Text variant="small" style={{ textTransform: 'capitalize', flex: 1 }}>{cat.category}</Text>
                <Text variant="small" weight="bold">{formatCurrency(cat.amount)}</Text>
                <Text variant="caption" color="muted">{Math.round(cat.percentage)}%</Text>
              </Flex>
            ))}
          </Stack>
        </Switcher>
      </Stack>
    </Card>
  );
}
