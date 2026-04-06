'use client';

import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Card, Chart, Flex, Stack, Switcher, Text } from 'doom-design-system';
// Behavior type matches doom's Chart behavior contract
type Behavior = (ctx: any) => (() => void) | void;
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

// Custom behavior: dim non-hovered donut slices via chartStore subscription
function dimSlices(onHover: (category: string | null) => void): Behavior {
  return ({ getChartContext, getInteraction }: any) => {
    const ctx = getChartContext();
    if (!ctx?.g) return;
    const { g, chartStore } = ctx;

    const update = () => {
      const interaction = getInteraction('primary-hover');
      const targets = interaction?.targets || [];

      if (targets.length === 0) {
        onHover(null);
        g.selectAll('path[data-chart-type="donut"]').style('opacity', 1);
        return;
      }

      const hovered = targets[0]?.data as CategorySpending | undefined;
      if (!hovered) return;
      onHover(hovered.category);

      g.selectAll('path[data-chart-type="donut"]').style('opacity', function (this: any) {
        const datum = this.__data__?.data;
        return datum?.category === hovered.category ? 1 : 0.3;
      });
    };

    const unsubscribe = chartStore.subscribe(update);
    return () => {
      unsubscribe();
      g.selectAll('path[data-chart-type="donut"]').style('opacity', 1);
    };
  };
}

interface SpendingChartProps {
  data: CategorySpending[];
  total: number;
}

export function SpendingChart({ data, total }: SpendingChartProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const size = 160;

  const behaviors = useMemo(() => [dimSlices(setHoveredCategory)], []);

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
                d3Config={{ showAxes: false, grid: false }}
                withFrame={false}
                flat
                style={{ width: '100%', height: '100%' }}
                behaviors={behaviors}
                onValueChange={(d) => setHoveredCategory(d ? (d as CategorySpending).category : null)}
                render={(frame) => {
                  const { container, data: frameData, size: chartSize } = frame;
                  if (!frameData.length) return;

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

                  // Center text — show hovered category or total
                  const centerAmount = hoveredCategory
                    ? frameData.find((d: CategorySpending) => d.category === hoveredCategory)?.amount ?? total
                    : total;

                  g.selectAll('.center-text').data([null]).join('text')
                    .attr('class', 'center-text')
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .attr('font-size', '16px')
                    .attr('font-weight', '700')
                    .attr('fill', 'var(--foreground)')
                    .text(formatCurrency(centerAmount));
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
                  cursor: 'default',
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
