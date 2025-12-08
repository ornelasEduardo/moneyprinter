import React, { useMemo } from 'react';
import {  ColumnDef } from '@tanstack/react-table';
import { Card, Flex, Table, Text } from 'doom-design-system';

interface ProjectionData {
  label: string;
  change: number;
  windfalls: number;
  newTotal: number;
  startTotal: number;
  date: string;
}

interface ProjectionsTableProps {
  projections: ProjectionData[];
  selectedYear: number;
  currentYear: number;
  onYearChange: (year: string) => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export default function ProjectionsTable({
  projections,
  selectedYear,
}: ProjectionsTableProps) {
  const columns = useMemo<ColumnDef<ProjectionData>[]>(
    () => [
      {
        accessorKey: 'label',
        header: 'Month',
        cell: (info) => <Text weight="medium">{info.getValue() as string}</Text>,
      },
      {
        accessorKey: 'change',
        header: 'Change',
        cell: (info) => {
          const val = info.getValue() as number;
          return (
            <Text 
              weight="medium" 
              align="right" 
              as="div"
              color={val >= 0 ? 'success' : 'error'}
            >
              {val > 0 ? '+' : ''}{formatCurrency(val)}
            </Text>
          );
        },
      },
      {
        accessorKey: 'windfalls',
        header: 'Windfalls',
        cell: (info) => {
          const val = info.getValue() as number;
          return (
            <Text 
              align="right" 
              as="div"
              color={val > 0 ? 'success' : 'muted'}
            >
              {val > 0 ? `+${formatCurrency(val)}` : '-'}
            </Text>
          );
        },
      },
      {
        accessorKey: 'newTotal',
        header: 'New Total',
        cell: (info) => (
          <Text weight="bold" align="right" as="div">
            {formatCurrency(info.getValue() as number)}
          </Text>
        ),
      },
    ],
    []
  );

  return (
    <Card className="h-full">
      <Flex direction="column" className="h-full">
        <Flex justify="space-between" align="center" className="mb-4">
          <Text variant="h6" color="muted">Projections ({selectedYear})</Text>
        </Flex>
        
        <div className="flex-1 min-h-0">
          <Table 
            data={projections} 
            columns={columns} 
            enablePagination={false}
            enableFiltering={false}
            enableSorting={false}
            variant="flat"
            density="compact"
            striped
          />
        </div>
      </Flex>
    </Card>
  );
}
