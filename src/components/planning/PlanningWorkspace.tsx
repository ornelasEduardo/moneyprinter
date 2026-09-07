'use client';

import type { ReactNode } from 'react';
import { Container, Stack, Text, Flex } from 'doom-design-system';

// No wrapping Card — the tool composes its own cards, which one outer card would flatten.
export function PlanningWorkspace({ title, header, children }: {
  title: string; header?: ReactNode; children: ReactNode;
}) {
  return (
    <Container maxWidth="lg">
      <Stack gap={6}>
        <Flex align="center" justify="space-between" wrap gap={3}>
          <Text variant="h2" weight="black">{title}</Text>
          {header}
        </Flex>
        {children}
      </Stack>
    </Container>
  );
}
