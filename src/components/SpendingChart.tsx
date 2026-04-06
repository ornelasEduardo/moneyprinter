'use client';

import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Card, Flex, Stack, Switcher, Text } from 'doom-design-system';
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
  const svgRef = useRef<SVGSVGElement>(null);
  const size = 180;
  const radius = size / 2;
  const innerRadius = radius * 0.6;

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${radius},${radius})`);
    const pie = d3.pie<CategorySpending>().value((d) => d.amount).sort(null);
    const arc = d3.arc<d3.PieArcDatum<CategorySpending>>()
      .innerRadius(innerRadius)
      .outerRadius(radius - 2);

    g.selectAll('path')
      .data(pie(data))
      .join('path')
      .attr('d', arc)
      .attr('fill', (_, i) => COLORS[i % COLORS.length])
      .attr('stroke', 'var(--card-bg)')
      .attr('stroke-width', 2);

    // Center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '18px')
      .attr('font-weight', '700')
      .attr('fill', 'var(--foreground)')
      .text(formatCurrency(total));
  }, [data, total, radius, innerRadius]);

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
        <Switcher threshold="sm" gap={6} align="flex-start">
          <Flex justify="center">
            <svg ref={svgRef} width={size} height={size} style={{ flexShrink: 0 }} />
          </Flex>
          <Stack gap={2} style={{ flex: 1 }}>
            {data.slice(0, 8).map((cat, i) => (
              <Flex key={cat.category} align="center" justify="space-between" gap={3}>
                <Flex align="center" gap={2} style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    backgroundColor: COLORS[i % COLORS.length],
                    flexShrink: 0,
                  }} />
                  <Text variant="small" style={{ textTransform: 'capitalize' }}>{cat.category}</Text>
                </Flex>
                <Text variant="small" weight="bold">{formatCurrency(cat.amount)}</Text>
                <Text variant="caption" color="muted" style={{ width: 40, textAlign: 'right' }}>
                  {Math.round(cat.percentage)}%
                </Text>
              </Flex>
            ))}
          </Stack>
        </Switcher>
      </Stack>
    </Card>
  );
}
