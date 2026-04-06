'use client';

import { useState } from 'react';
import { Button, Card, Flex, Slat, Stack, Text, Badge, Sheet } from 'doom-design-system';
import { Repeat } from 'lucide-react';
import type { RecurringCharge } from '@/lib/recurring';

interface RecurringChargesProps {
  charges: RecurringCharge[];
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const FREQ_LABELS: Record<string, string> = {
  weekly: '/wk',
  biweekly: '/2wk',
  monthly: '/mo',
  quarterly: '/qtr',
  annual: '/yr',
};

function monthlyEquivalent(charge: RecurringCharge): number {
  switch (charge.frequency) {
    case 'weekly': return charge.amount * 4.33;
    case 'biweekly': return charge.amount * 2.17;
    case 'monthly': return charge.amount;
    case 'quarterly': return charge.amount / 3;
    case 'annual': return charge.amount / 12;
  }
}

export function RecurringCharges({ charges }: RecurringChargesProps) {
  const [showAll, setShowAll] = useState(false);
  const totalMonthly = charges.reduce((sum, c) => sum + monthlyEquivalent(c), 0);
  const displayCharges = charges.slice(0, 5);

  return (
    <>
      <Card>
        <Stack gap={4}>
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={2}>
              <Repeat size={18} strokeWidth={2.5} />
              <Text variant="h5" weight="bold">Recurring Charges</Text>
            </Flex>
            <Text weight="bold">{formatCurrency(totalMonthly)}/mo</Text>
          </Flex>

          {charges.length === 0 ? (
            <Text color="muted">No recurring charges detected</Text>
          ) : (
            <Stack gap={2}>
              {displayCharges.map((charge) => (
                <Slat
                  key={charge.name}
                  label={charge.name}
                  secondaryLabel={`${charge.confidence === 'medium' ? 'likely ' : ''}${charge.frequency}`}
                  appendContent={
                    <Text weight="bold" variant="small">
                      {formatCurrency(charge.amount)}{FREQ_LABELS[charge.frequency]}
                    </Text>
                  }
                />
              ))}
            </Stack>
          )}

          {charges.length > 5 && (
            <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
              View all {charges.length} recurring charges
            </Button>
          )}
        </Stack>
      </Card>

      <Sheet
        isOpen={showAll}
        onClose={() => setShowAll(false)}
        title={<Text variant="h5" as="h1">All recurring charges</Text>}
      >
        <Sheet.Body>
          <Stack gap={2}>
            {charges.map((charge) => (
              <Slat
                key={charge.name}
                label={charge.name}
                secondaryLabel={
                  <Flex gap={2} align="center">
                    <Text variant="caption" color="muted">{charge.frequency}</Text>
                    <Badge variant={charge.confidence === 'high' ? 'success' : 'warning'} size="sm">
                      {charge.confidence}
                    </Badge>
                  </Flex>
                }
                appendContent={
                  <Stack gap={0} align="flex-end">
                    <Text weight="bold" variant="small">
                      {formatCurrency(charge.amount)}{FREQ_LABELS[charge.frequency]}
                    </Text>
                    <Text variant="caption" color="muted">
                      {charge.transactions} charges
                    </Text>
                  </Stack>
                }
              />
            ))}
          </Stack>
        </Sheet.Body>
      </Sheet>
    </>
  );
}
