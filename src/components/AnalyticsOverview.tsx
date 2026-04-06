'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, Container, Grid, Stack, Switcher, Text, Flex } from 'doom-design-system';
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
    const savingsRate = totalIncome > 0 ? Math.round((totalNet / totalIncome) * 100) : 0;
    return { totalSpent, totalIncome, totalNet, savingsRate };
  }, [spending, cashFlowData]);

  return (
    <Container maxWidth="xl">
      <Stack gap={8}>
        <TimeRangePicker onChange={fetchData} />

        {loading ? (
          <Text color="muted">Loading...</Text>
        ) : (
          <Stack gap={8}>
            {/* Hero stat — the answer to "am I doing well?" */}
            <div className={styles.hero}>
              <Text
                variant="h1"
                weight="black"
                className={styles.heroNumber}
                style={{ color: totals.totalNet >= 0 ? 'var(--success)' : 'var(--error)' }}
              >
                {totals.totalNet >= 0 ? '+' : ''}{formatCurrency(totals.totalNet)}
              </Text>
              <Text color="muted" className={styles.heroLabel}>
                {totals.savingsRate > 0
                  ? `saved ${totals.savingsRate}% of ${formatCurrency(totals.totalIncome)} earned`
                  : `overspent by ${formatCurrency(Math.abs(totals.totalNet))}`
                }
              </Text>
            </div>

            {/* Two-column detail: where it went + when it happened */}
            <Grid columns="1fr 1fr" gap={6} className={styles.chartGrid}>
              <SpendingChart
                data={spending}
                total={totals.totalSpent}
              />
              <CashFlowChart data={cashFlowData} />
            </Grid>

            {/* Recurring — de-emphasized, compact */}
            <RecurringCharges charges={recurring} />
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
