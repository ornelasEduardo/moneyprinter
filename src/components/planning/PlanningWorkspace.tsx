'use client';

import type { ReactNode } from 'react';
import { Container, Stack, Text, Flex } from 'doom-design-system';

// Layout shell for a Planning tool: a page title + optional header action,
// then the tool's own content. It deliberately does NOT wrap children in a
// Card — a calculator composes several cards (hero, inputs, assessment), and a
// single outer card would flatten that hierarchy into one slab.
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
