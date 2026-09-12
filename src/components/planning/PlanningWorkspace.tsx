'use client';

import type { ReactNode } from 'react';
import { Container, Stack, Text, Flex } from 'doom-design-system';
import { ArrowLeft } from 'lucide-react';
import styles from './PlanningWorkspace.module.scss';

// No wrapping Card — the tool composes its own cards, which one outer card would flatten.
export function PlanningWorkspace({ title, header, backHref, children }: {
  title: string; header?: ReactNode; backHref?: string; children: ReactNode;
}) {
  return (
    <Container maxWidth="lg">
      <Stack gap={6}>
        <div>
          {backHref && (
            <a href={backHref} className={styles.back}>
              <ArrowLeft size={16} strokeWidth={2.5} /> Back to Plan
            </a>
          )}
          <Flex align="center" justify="space-between" wrap gap={3}>
            <Text variant="h2" weight="black">{title}</Text>
            {header}
          </Flex>
        </div>
        {children}
      </Stack>
    </Container>
  );
}
