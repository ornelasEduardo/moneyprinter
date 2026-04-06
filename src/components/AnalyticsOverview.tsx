'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, Container, Grid, Stack, Switcher, Text, Flex } from 'doom-design-system';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { TimeRangePicker } from './TimeRangePicker';
import { SpendingChart } from './SpendingChart';
import { CashFlowChart } from './CashFlowChart';
import { RecurringCharges } from './RecurringCharges';
import { getSpendingByCategory, getCashFlow, getRecurringCharges } from '@/app/actions/analytics';
import type { CategorySpending, CashFlowPeriod } from '@/lib/analytics';
import type { RecurringCharge } from '@/lib/recurring';
import styles from './AnalyticsOverview.module.scss';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

function monthlyEquivalent(charge: RecurringCharge): number {
  switch (charge.frequency) {
    case 'weekly': return charge.amount * 4.33;
    case 'biweekly': return charge.amount * 2.17;
    case 'monthly': return charge.amount;
    case 'quarterly': return charge.amount / 3;
    case 'annual': return charge.amount / 12;
  }
}

export default function AnalyticsOverview() {
  const [spending, setSpending] = useState<CategorySpending[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowPeriod[]>([]);
  const [recurring, setRecurring] = useState<RecurringCharge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    try {
      const [spendingResult, cashFlowResult, recurringResult] = await Promise.all([
        getSpendingByCategory(start, end),
        getCashFlow(start, end, 'month'),
        getRecurringCharges(start, end),
      ]);
      setSpending(spendingResult);
      setCashFlowData(cashFlowResult);
      setRecurring(recurringResult);
    } finally {
      setLoading(false);
    }
  }, []);

  const totals = useMemo(() => {
    const totalSpent = spending.reduce((sum, c) => sum + c.amount, 0);
    const totalIncome = cashFlowData.reduce((sum, d) => sum + d.income, 0);
    const totalNet = cashFlowData.reduce((sum, d) => sum + d.net, 0);
    const totalRecurring = recurring.reduce((sum, c) => sum + monthlyEquivalent(c), 0);
    return { totalSpent, totalIncome, totalNet, totalRecurring };
  }, [spending, cashFlowData, recurring]);

  return (
    <Container maxWidth="xl">
      <Stack gap={6}>
        <TimeRangePicker onChange={fetchData} />

        {loading ? (
          <Text color="muted">Loading...</Text>
        ) : (
          <Stack gap={6}>
            {/* Headline stats */}
            <Grid columns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
              <Card className={styles.statCard}>
                <Stack gap={1}>
                  <Flex align="center" gap={2}>
                    <TrendingUp size={14} strokeWidth={2.5} style={{ color: 'var(--success)' }} />
                    <Text variant="caption" color="muted">Earned</Text>
                  </Flex>
                  <Text variant="h4" weight="bold">{formatCurrency(totals.totalIncome)}</Text>
                </Stack>
              </Card>
              <Card className={styles.statCard}>
                <Stack gap={1}>
                  <Flex align="center" gap={2}>
                    <TrendingDown size={14} strokeWidth={2.5} style={{ color: 'var(--error)' }} />
                    <Text variant="caption" color="muted">Spent</Text>
                  </Flex>
                  <Text variant="h4" weight="bold">{formatCurrency(totals.totalSpent)}</Text>
                </Stack>
              </Card>
              <Card className={styles.statCard}>
                <Stack gap={1}>
                  <Flex align="center" gap={2}>
                    <Wallet size={14} strokeWidth={2.5} />
                    <Text variant="caption" color="muted">Net</Text>
                  </Flex>
                  <Text
                    variant="h4"
                    weight="bold"
                    style={{ color: totals.totalNet >= 0 ? 'var(--success)' : 'var(--error)' }}
                  >
                    {totals.totalNet >= 0 ? '+' : ''}{formatCurrency(totals.totalNet)}
                  </Text>
                </Stack>
              </Card>
            </Grid>

            {/* Main dashboard grid */}
            <Switcher threshold="md" gap={6}>
              <SpendingChart
                data={spending}
                total={totals.totalSpent}
              />
              <RecurringCharges charges={recurring} />
            </Switcher>

            {/* Cash flow — full width */}
            <CashFlowChart data={cashFlowData} />
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
