'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, Container, Stack, Text, Flex } from 'doom-design-system';
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
    <Container maxWidth="lg">
      <Stack gap={6}>
        {/* Header row: title + time picker */}
        <Flex align="center" justify="space-between" wrap gap={3}>
          <Stack gap={0}>
            <Text variant="h4" weight="bold">Overview</Text>
            {!loading && (
              <Text variant="small" color="muted">
                {formatCurrency(totals.totalIncome)} earned,{' '}
                {formatCurrency(totals.totalSpent)} spent,{' '}
                <span style={{ color: totals.totalNet >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {totals.totalNet >= 0 ? '+' : ''}{formatCurrency(totals.totalNet)} net
                </span>
              </Text>
            )}
          </Stack>
          <TimeRangePicker onChange={fetchData} />
        </Flex>

        {loading ? (
          <Text color="muted">Loading...</Text>
        ) : (
          <Stack gap={6}>
            <SpendingChart data={spending} total={totals.totalSpent} />
            <CashFlowChart data={cashFlowData} />
            <RecurringCharges charges={recurring} />
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
