'use client';

import type { ReactNode } from 'react';
import { Container, Stack, Text, Flex } from 'doom-design-system';
import BackLink from '@/components/BackLink';

// No wrapping Card — the tool composes its own cards, which one outer card would flatten.
export function PlanningWorkspace({ title, header, backHref, children }: {
  title: string; header?: ReactNode; backHref?: string; children: ReactNode;
}) {
  return (
    <Container maxWidth="lg">
      <Stack gap={6}>
        <Flex align="center" justify="space-between" wrap gap={3}>
          <Flex align="center" gap={3}>
            {backHref && <BackLink href={backHref} ariaLabel="Back to Plan" />}
            <Text variant="h2" weight="black">{title}</Text>
          </Flex>
          {header}
        </Flex>
        {children}
      </Stack>
    </Container>
  );
}
