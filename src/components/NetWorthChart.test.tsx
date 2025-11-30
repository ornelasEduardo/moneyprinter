import { render, screen } from '@testing-library/react';
import NetWorthChart from './NetWorthChart';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

describe('NetWorthChart', () => {
  const mockData = [
    { date: '2024-01-01', netWorth: 10000 },
    { date: '2024-02-01', netWorth: 11000 },
  ];

  it('should render svg', () => {
    // We need to mock getComputedStyle for the gradient color
    window.getComputedStyle = vi.fn().mockReturnValue({
      getPropertyValue: () => '#000000',
    } as any);

    // Mock clientWidth/clientHeight for the container
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 500 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 300 });

    const { container } = render(<NetWorthChart data={mockData} />);
    
    // Check if SVG is rendered
    // Note: D3 renders inside the ref, which is an SVG element.
    // In JSDOM, D3 should work for basic DOM manipulation.
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    
    // Check if we have some paths (line and area)
    // We might need to wait for useEffect?
    // useEffect runs after render.
    // render() in testing-library is synchronous but effects run.
    
    // Let's check for the group element created by D3
    const g = container.querySelector('g');
    expect(g).toBeInTheDocument();
    
    // Check for dots
    const dots = container.querySelectorAll('circle');
    expect(dots.length).toBe(2);
  });

  it('should handle empty data', () => {
    const { container } = render(<NetWorthChart data={[]} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // Should be empty inside (except maybe for what was there initially, but we clear it)
    // Actually our component clears it: d3.select(svgRef.current).selectAll('*').remove();
    // So it should be empty.
    expect(svg?.children.length).toBe(0);
  });
});
