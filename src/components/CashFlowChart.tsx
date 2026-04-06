'use client';

import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Card, Flex, Stack, Text, Badge } from 'doom-design-system';
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

export function CashFlowChart({ data }: CashFlowChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 280;
    const margin = { top: 16, right: 16, bottom: 32, left: 56 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const periods = data.map((d) => formatPeriodLabel(d.period));
    const maxVal = d3.max(data, (d) => Math.max(d.income, d.expenses)) ?? 0;

    const x0 = d3.scaleBand().domain(periods).range([0, innerW]).padding(0.3);
    const x1 = d3.scaleBand().domain(['income', 'expenses']).range([0, x0.bandwidth()]).padding(0.08);
    const y = d3.scaleLinear().domain([0, maxVal * 1.1]).range([innerH, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y).tickSize(-innerW).tickFormat(() => ''))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick line')
        .attr('stroke', 'var(--card-border)')
        .attr('stroke-opacity', 0.3));

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x0).tickSize(0))
      .call((g) => g.select('.domain').attr('stroke', 'var(--card-border)'))
      .call((g) => g.selectAll('text')
        .attr('fill', 'var(--muted-foreground)')
        .attr('font-size', 'var(--text-xs)'));

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat((d) => `$${Number(d) >= 1000 ? `${Number(d) / 1000}k` : d}`))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('text')
        .attr('fill', 'var(--muted-foreground)')
        .attr('font-size', 'var(--text-xs)'));

    // Bars
    const barGroups = g.selectAll('.bar-group')
      .data(data)
      .join('g')
      .attr('transform', (d) => `translate(${x0(formatPeriodLabel(d.period))},0)`);

    // Income bars — doom style: fill + border stroke
    barGroups.append('rect')
      .attr('x', x1('income')!)
      .attr('y', (d) => y(d.income))
      .attr('width', x1.bandwidth())
      .attr('height', (d) => innerH - y(d.income))
      .attr('fill', 'var(--success)')
      .attr('stroke', 'var(--card-border)')
      .attr('stroke-width', 1.5)
      .attr('rx', 2);

    // Expense bars — doom style
    barGroups.append('rect')
      .attr('x', x1('expenses')!)
      .attr('y', (d) => y(d.expenses))
      .attr('width', x1.bandwidth())
      .attr('height', (d) => innerH - y(d.expenses))
      .attr('fill', 'var(--error)')
      .attr('stroke', 'var(--card-border)')
      .attr('stroke-width', 1.5)
      .attr('rx', 2);

  }, [data]);

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

  return (
    <Card>
      <Stack gap={4}>
        <Stack gap={2}>
          <Text variant="h5" weight="bold">Cash Flow</Text>
          <Flex gap={2} wrap align="center">
            <Badge variant="success">{formatCurrency(totalIncome)}</Badge>
            <Text variant="caption" color="muted">earned</Text>
            <Text variant="caption" color="muted">&minus;</Text>
            <Badge variant="error">{formatCurrency(totalExpenses)}</Badge>
            <Text variant="caption" color="muted">spent</Text>
            <Text variant="caption" color="muted">=</Text>
            <Badge variant={totalNet >= 0 ? 'success' : 'error'}>
              {totalNet >= 0 ? '+' : ''}{formatCurrency(totalNet)}
            </Badge>
            <Text variant="caption" color="muted">net</Text>
          </Flex>
        </Stack>
        <div ref={containerRef} style={{ width: '100%', minHeight: 280 }}>
          <svg ref={svgRef} style={{ display: 'block', width: '100%' }} />
        </div>
      </Stack>
    </Card>
  );
}
