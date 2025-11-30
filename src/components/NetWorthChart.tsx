'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface NetWorthData {
  date: string;
  netWorth: number;
}

interface NetWorthChartProps {
  data: NetWorthData[];
}

export default function NetWorthChart({ data }: NetWorthChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Setup dimensions
    const margin = { top: 20, right: 30, bottom: 30, left: 60 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = svgRef.current.clientHeight - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse dates
    // Replace hyphens with slashes to force local time parsing (YYYY/MM/DD)
    // This prevents timezone shifts (e.g. Jan 1 becoming Dec 31)
    const parsedData = data.map(d => ({
      ...d,
      dateObj: new Date(d.date.replace(/-/g, '/'))
    })).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    // Scales
    const x = d3.scaleTime()
      .domain(d3.extent(parsedData, d => d.dateObj) as [Date, Date])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([
        (d3.min(parsedData, d => d.netWorth) || 0) * 0.8, // 20% padding at bottom
        (d3.max(parsedData, d => d.netWorth) || 0) * 1.05
      ])
      .range([height, 0]);

    // Add X Axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat('%b %d') as any))
      .attr('font-size', '0.75rem')
      .attr('color', 'var(--muted-foreground)')
      .select('.domain').remove();

    // Add Y Axis
    svg.append('g')
      .call(d3.axisLeft(y)
        .ticks(5)
        .tickFormat(d => `$${(d as number) >= 1000 ? (d as number) / 1000 + 'k' : d}`)
      )
      .attr('font-size', '0.75rem')
      .attr('color', 'var(--muted-foreground)')
      .select('.domain').remove();

    // Add Horizontal Grid Lines
    svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y)
        .ticks(5)
        .tickSize(-width)
        .tickFormat(() => '')
      )
      .attr('stroke', 'var(--card-border)')
      .attr('stroke-opacity', 0.1)
      .select('.domain').remove();

    // Gradient
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    // Get primary color from CSS variable
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', primaryColor)
      .attr('stop-opacity', 0.2);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', primaryColor)
      .attr('stop-opacity', 0);

    // Area generator
    const area = d3.area<{ dateObj: Date; netWorth: number }>()
      .x(d => x(d.dateObj))
      .y0(height)
      .y1(d => y(d.netWorth))
      .curve(d3.curveMonotoneX);

    // Line generator
    const line = d3.line<{ dateObj: Date; netWorth: number }>()
      .x(d => x(d.dateObj))
      .y(d => y(d.netWorth))
      .curve(d3.curveMonotoneX);

    // Add area
    svg.append('path')
      .datum(parsedData)
      .attr('fill', 'url(#area-gradient)')
      .attr('d', area);

    // Add line
    svg.append('path')
      .datum(parsedData)
      .attr('fill', 'none')
      .attr('stroke', primaryColor)
      .attr('stroke-width', 3)
      .attr('d', line);

    // Add dots
    const dots = svg.selectAll('.dot')
      .data(parsedData)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => x(d.dateObj))
      .attr('cy', d => y(d.netWorth))
      .attr('r', 4)
      .attr('fill', primaryColor)
      .attr('stroke', 'var(--card-bg)') // Use card background for stroke to create a "cutout" effect
      .attr('stroke-width', 2);

    // Create tooltip
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'var(--card-bg)')
      .style('border', '1px solid var(--card-border)')
      .style('border-radius', 'var(--radius)')
      .style('padding', '0.75rem')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('box-shadow', 'var(--shadow-hard)');

    // Formatters
    const formatCurrency = (value: number) => 
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    const formatDate = d3.timeFormat('%B %d, %Y');

    // Add vertical line for hover
    const hoverLine = svg.append('line')
      .attr('class', 'hover-line')
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', 'var(--muted-foreground)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4')
      .style('opacity', 0);

    // Add invisible overlay for mouse tracking
    const overlay = svg.append('rect')
      .attr('class', 'overlay')
      .attr('width', width)
      .attr('height', height)
      .style('fill', 'none')
      .style('pointer-events', 'all')
      .style('cursor', 'crosshair');

    // Bisector
    const bisect = d3.bisector((d: any) => d.dateObj).left;

    overlay
      .on('mousemove', function(event) {
        const [mouseX] = d3.pointer(event);
        const x0 = x.invert(mouseX);
        const i = bisect(parsedData, x0, 1);
        const d0 = parsedData[i - 1];
        const d1 = parsedData[i];
        
        if (!d0 && !d1) return;
        
        const d = !d1 ? d0 : !d0 ? d1 : 
          x0.getTime() - d0.dateObj.getTime() > d1.dateObj.getTime() - x0.getTime() ? d1 : d0;

        // Update hover line
        hoverLine
          .attr('x1', x(d.dateObj))
          .attr('x2', x(d.dateObj))
          .style('opacity', 1);

        // Highlight the active dot
        dots
          .attr('r', 4)
          .attr('stroke-width', 2);
        
        dots.filter((dot: any) => dot === d)
          .attr('r', 6)
          .attr('stroke-width', 3);

        // Tooltip content
        tooltip
          .style('visibility', 'visible')
          .html(`
            <div style="color: var(--foreground)">
              <div style="font-weight: 600; margin-bottom: 0.25rem">${formatDate(d.dateObj)}</div>
              <div style="color: var(--primary); font-size: 1.1rem; font-weight: bold">${formatCurrency(d.netWorth)}</div>
            </div>
          `)
          .style('top', (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', function() {
        hoverLine.style('opacity', 0);
        dots
          .attr('r', 4)
          .attr('stroke-width', 2);
        tooltip.style('visibility', 'hidden');
      });

    // Cleanup
    return () => {
      tooltip.remove();
    };
  }, [data]);

  return (
    <svg 
      ref={svgRef} 
      style={{ width: '100%', height: '100%', minHeight: '300px' }}
    />
  );
}
