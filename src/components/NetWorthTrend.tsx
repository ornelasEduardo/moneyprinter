'use client';

import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Card, Stack, Text, Flex } from 'doom-design-system';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface NetWorthEntry {
  date: string;
  netWorth: number;
}

interface NetWorthTrendProps {
  data: NetWorthEntry[];
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export function NetWorthTrend({ data }: NetWorthTrendProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length < 2) return;

    const width = containerRef.current.clientWidth;
    const height = 160;
    const margin = { top: 8, right: 16, bottom: 24, left: 56 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const dates = data.map((d) => new Date(d.date));
    const values = data.map((d) => d.netWorth);

    const x = d3.scaleTime()
      .domain(d3.extent(dates) as [Date, Date])
      .range([0, innerW]);

    const y = d3.scaleLinear()
      .domain([d3.min(values)! * 0.95, d3.max(values)! * 1.05])
      .range([innerH, 0]);

    // Grid
    g.append('g')
      .call(d3.axisLeft(y).ticks(3).tickSize(-innerW).tickFormat(() => ''))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick line')
        .attr('stroke', 'var(--card-border)')
        .attr('stroke-opacity', 0.2));

    // Area
    const area = d3.area<NetWorthEntry>()
      .x((d) => x(new Date(d.date)))
      .y0(innerH)
      .y1((d) => y(d.netWorth))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('d', area)
      .attr('fill', 'var(--primary)')
      .attr('fill-opacity', 0.1);

    // Line
    const line = d3.line<NetWorthEntry>()
      .x((d) => x(new Date(d.date)))
      .y((d) => y(d.netWorth))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', 'var(--primary)')
      .attr('stroke-width', 2);

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(4).tickFormat((d) =>
        (d as Date).toLocaleDateString('en-US', { month: 'short' })
      ))
      .call((g) => g.select('.domain').attr('stroke', 'var(--card-border)'))
      .call((g) => g.selectAll('text')
        .attr('fill', 'var(--muted-foreground)')
        .attr('font-size', 'var(--text-xs)'));

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(3).tickFormat((d) =>
        `$${Number(d) >= 1000 ? `${(Number(d) / 1000).toFixed(0)}k` : d}`
      ))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('text')
        .attr('fill', 'var(--muted-foreground)')
        .attr('font-size', 'var(--text-xs)'));

  }, [data]);

  if (data.length < 2) {
    return null;
  }

  const latest = data[data.length - 1].netWorth;
  const earliest = data[0].netWorth;
  const change = latest - earliest;
  const isUp = change >= 0;

  return (
    <Card>
      <Stack gap={3}>
        <Flex align="center" justify="space-between">
          <Text variant="h5" weight="bold">Net Worth</Text>
          <Flex align="center" gap={2}>
            {isUp
              ? <TrendingUp size={14} strokeWidth={2.5} style={{ color: 'var(--success)' }} />
              : <TrendingDown size={14} strokeWidth={2.5} style={{ color: 'var(--error)' }} />
            }
            <Text variant="small" weight="bold" style={{ color: isUp ? 'var(--success)' : 'var(--error)' }}>
              {isUp ? '+' : ''}{formatCurrency(change)}
            </Text>
            <Text variant="small" color="muted">to {formatCurrency(latest)}</Text>
          </Flex>
        </Flex>
        <div ref={containerRef} style={{ width: '100%' }}>
          <svg ref={svgRef} style={{ display: 'block' }} />
        </div>
      </Stack>
    </Card>
  );
}
