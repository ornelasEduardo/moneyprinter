import { render, screen } from '@testing-library/react';
import ProjectionsTable from './ProjectionsTable';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// Mock Design System
vi.mock('doom-design-system', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  Flex: ({ children }: any) => <div>{children}</div>,
  Table: ({ data, columns }: any) => (
    <table>
      <thead>
        <tr>
          {columns.map((col: any) => <th key={col.header}>{col.header}</th>)}
        </tr>
      </thead>
      <tbody>
        {data.map((row: any) => (
          <tr key={row.label} data-testid="table-row">
            <td>{row.label}</td>
            <td>{columns.find((c: any) => c.accessorKey === 'change').cell({ getValue: () => row.change })}</td>
            <td>{columns.find((c: any) => c.accessorKey === 'windfalls').cell({ getValue: () => row.windfalls })}</td>
            <td>{columns.find((c: any) => c.accessorKey === 'newTotal').cell({ getValue: () => row.newTotal })}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
  Text: ({ children }: any) => <span>{children}</span>,
}));

describe('ProjectionsTable', () => {
  const mockProjections = [
    {
      label: 'Jan',
      change: 1000,
      windfalls: 0,
      newTotal: 11000,
      startTotal: 10000,
      date: '2024-01-01',
    },
    {
      label: 'Feb',
      change: -500,
      windfalls: 200,
      newTotal: 10500,
      startTotal: 11000,
      date: '2024-02-01',
    },
  ];

  it('should render projections', () => {
    render(
      <ProjectionsTable 
        projections={mockProjections} 
        selectedYear={2024} 
        currentYear={2024} 
        onYearChange={() => {}} 
      />
    );
    
    expect(screen.getByText('Projections (2024)')).toBeInTheDocument();
    expect(screen.getByText('Jan')).toBeInTheDocument();
    expect(screen.getByText('Feb')).toBeInTheDocument();
  });

  it('should format currency correctly', () => {
    render(
      <ProjectionsTable 
        projections={mockProjections} 
        selectedYear={2024} 
        currentYear={2024} 
        onYearChange={() => {}} 
      />
    );
    
    // Check positive change
    expect(screen.getByText('+$1,000.00')).toBeInTheDocument();
    
    // Check negative change (standard formatting might be -$500.00 or ($500.00))
    // Our component uses formatCurrency which uses standard Intl.NumberFormat
    // And it manually adds '+' for positive.
    // For negative, formatCurrency handles it.
    // Let's just check if the text exists.
    expect(screen.getByText('-$500.00')).toBeInTheDocument();
    
    // Check windfalls
    expect(screen.getByText('+$200.00')).toBeInTheDocument();
  });
});
