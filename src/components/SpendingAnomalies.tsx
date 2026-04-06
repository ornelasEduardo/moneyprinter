'use client';

import { Card, Flex, Stack, Text, Badge } from 'doom-design-system';
import { AlertTriangle } from 'lucide-react';
import type { SpendingAnomaly } from '@/lib/analytics';

interface SpendingAnomaliesProps {
  anomalies: SpendingAnomaly[];
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export function SpendingAnomalies({ anomalies }: SpendingAnomaliesProps) {
  if (anomalies.length === 0) return null;

  return (
    <Stack gap={2}>
      {anomalies.slice(0, 3).map((anomaly) => (
        <Card key={anomaly.category} style={{ padding: 0 }}>
          <Flex align="center" gap={3} style={{ padding: 'var(--space-3) var(--space-4)' }}>
            <AlertTriangle
              size={16}
              strokeWidth={2.5}
              style={{ color: 'var(--warning)', flexShrink: 0 }}
            />
            <Text variant="small" style={{ flex: 1 }}>
              <Text weight="bold" variant="small" as="span" style={{ textTransform: 'capitalize' }}>
                {anomaly.category}
              </Text>
              {' '}is at {formatCurrency(anomaly.currentAmount)}, that's{' '}
              <Text weight="bold" variant="small" as="span" style={{ color: 'var(--error)' }}>
                {anomaly.multiplier}x
              </Text>
              {' '}your usual {formatCurrency(anomaly.averageAmount)}/mo
            </Text>
          </Flex>
        </Card>
      ))}
    </Stack>
  );
}
