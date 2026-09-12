'use client';

import { Badge, Card, Flex, Text } from 'doom-design-system';
import { money } from '@/lib/planning/format';

const NUMERIC = { fontVariantNumeric: 'tabular-nums' as const };

interface EmergencyFundCardProps {
  target: number;
  monthlyExpenses: number;
}

// Status carries a text label as well as color (DESIGN.md §6.2 — never color
// alone). Tiers follow the common 3/6-month rule of thumb, framed neutrally.
function coverageStatus(monthsCovered: number): { label: string; variant: 'success' | 'warning' } {
  if (monthsCovered >= 6) return { label: 'Well covered', variant: 'success' };
  if (monthsCovered >= 3) return { label: 'Covered', variant: 'success' };
  return { label: 'Building', variant: 'warning' };
}

export function EmergencyFundCard({ target, monthlyExpenses }: EmergencyFundCardProps) {
  if (target <= 0) {
    return (
      <Card>
        <Flex direction="column" gap={2}>
          <Text variant="small" weight="bold" color="muted" className="uppercase" style={{ letterSpacing: '0.12em' }}>
            Emergency fund
          </Text>
          <Text color="muted">
            Set an emergency-fund target with the edit button on your goal to track your coverage.
          </Text>
        </Flex>
      </Card>
    );
  }

  const monthsCovered = monthlyExpenses > 0 ? target / monthlyExpenses : 0;
  const status = coverageStatus(monthsCovered);

  return (
    <Card>
      <Flex direction="column" gap={2}>
        <Flex justify="space-between" align="center" wrap gap={2}>
          <Text variant="small" weight="bold" color="muted" className="uppercase" style={{ letterSpacing: '0.12em' }}>
            Emergency fund
          </Text>
          <Badge variant={status.variant}>{status.label}</Badge>
        </Flex>
        <Text variant="h2" as="p" weight="black" style={NUMERIC}>
          {money(target)}
        </Text>
        {monthlyExpenses > 0 && (
          <Text color="muted" style={NUMERIC}>
            {monthsCovered.toFixed(1)} months of expenses covered
          </Text>
        )}
      </Flex>
    </Card>
  );
}
