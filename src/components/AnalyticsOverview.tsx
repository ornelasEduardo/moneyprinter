'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, Container, Stack, Text, Flex, Badge } from 'doom-design-system';
import { TimeRangePicker } from './TimeRangePicker';
import { SpendingChart } from './SpendingChart';
import { CashFlowChart } from './CashFlowChart';
import { RecurringCharges } from './RecurringCharges';
import { SpendingAnomalies } from './SpendingAnomalies';
import { NetWorthTrend } from './NetWorthTrend';
import {
  getSpendingByCategory, getCashFlow, getRecurringCharges,
  getSpendingAnomalies, getNetWorthTrend,
} from '@/app/actions/analytics';
import type { CategorySpending, CashFlowPeriod, SpendingAnomaly } from '@/lib/analytics';
import type { RecurringCharge } from '@/lib/recurring';
import styles from './AnalyticsOverview.module.scss';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function AnalyticsOverview() {
  const [spending, setSpending] = useState<CategorySpending[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowPeriod[]>([]);
  const [recurring, setRecurring] = useState<RecurringCharge[]>([]);
  const [anomalies, setAnomalies] = useState<SpendingAnomaly[]>([]);
  const [netWorthData, setNetWorthData] = useState<{ date: string; netWorth: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    try {
      const [spendingResult, cashFlowResult, recurringResult, anomalyResult, nwResult] = await Promise.all([
        getSpendingByCategory(start, end),
        getCashFlow(start, end, 'month'),
        getRecurringCharges(start, end),
        getSpendingAnomalies(start, end),
        getNetWorthTrend(start, end),
      ]);
      setSpending(spendingResult);
      setCashFlowData(cashFlowResult);
      setRecurring(recurringResult);
      setAnomalies(anomalyResult);
      setNetWorthData(nwResult);
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
    <Container maxWidth="lg">
      <Stack gap={6}>
        {/* Header */}
        <Flex align="center" justify="space-between" wrap gap={3}>
          <Text variant="h4" weight="bold">Overview</Text>
          <TimeRangePicker onChange={fetchData} />
        </Flex>

        {loading ? (
          <Text color="muted">Loading...</Text>
        ) : (
          <Stack gap={6}>
            {/* Savings rate headline */}
            <Card className={styles.savingsCard}>
              <Flex align="center" justify="space-between" wrap gap={4}>
                <Stack gap={0}>
                  <Text variant="caption" color="muted">Savings rate</Text>
                  <Flex align="baseline" gap={2}>
                    <Text
                      variant="h2"
                      weight="black"
                      style={{ color: totals.savingsRate >= 0 ? 'var(--success)' : 'var(--error)' }}
                    >
                      {totals.savingsRate}%
                    </Text>
                    <Text variant="small" color="muted">
                      {totals.totalNet >= 0 ? 'saved' : 'overspent'} {formatCurrency(Math.abs(totals.totalNet))}
                    </Text>
                  </Flex>
                </Stack>
                <Flex gap={6} align="baseline">
                  <Stack gap={0}>
                    <Text variant="caption" color="muted">Earned</Text>
                    <Text weight="bold">{formatCurrency(totals.totalIncome)}</Text>
                  </Stack>
                  <Stack gap={0}>
                    <Text variant="caption" color="muted">Spent</Text>
                    <Text weight="bold">{formatCurrency(totals.totalSpent)}</Text>
                  </Stack>
                </Flex>
              </Flex>
            </Card>

            {/* Anomaly callouts */}
            <SpendingAnomalies anomalies={anomalies} />

            {/* Spending breakdown */}
            <SpendingChart data={spending} total={totals.totalSpent} />

            {/* Cash flow */}
            <CashFlowChart data={cashFlowData} />

            {/* Net worth trend */}
            <NetWorthTrend data={netWorthData} />

            {/* Recurring */}
            <RecurringCharges charges={recurring} />
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
