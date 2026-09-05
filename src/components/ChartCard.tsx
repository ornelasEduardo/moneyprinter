'use client';

import type { ReactNode } from 'react';
import { Card, Stack, Text, Flex } from 'doom-design-system';

interface ChartCardProps {
  title: string;
  // Right-aligned header content (toggles, stat readouts).
  header?: ReactNode;
  // The chart body — always rendered, even with empty data: a doom Chart that
  // first mounts late fails to establish its plot dimensions and hover wiring.
  children: ReactNode;
  // Shown below the chart when there is nothing to plot yet.
  footer?: ReactNode;
}

export function ChartCard({ title, header, children, footer }: ChartCardProps) {
  return (
    <Card>
      <Stack gap={3}>
        <Flex align="center" justify="space-between" wrap gap={3}>
          <Text variant="h5" weight="bold">{title}</Text>
          {header}
        </Flex>
        {children}
        {footer}
      </Stack>
    </Card>
  );
}
