'use client';

import type { ReactNode } from 'react';
import { Card, Container, Stack, Text, Flex } from 'doom-design-system';

export function PlanningWorkspace({ title, header, children }: {
  title: string; header?: ReactNode; children: ReactNode;
}) {
  return (
    <Container maxWidth="lg">
      <Stack gap={6}>
        <Flex align="center" justify="space-between" wrap gap={3}>
          <Text variant="h4" weight="bold">{title}</Text>
          {header}
        </Flex>
        <Card>{children}</Card>
      </Stack>
    </Container>
  );
}
