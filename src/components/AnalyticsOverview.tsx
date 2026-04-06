'use client';

import { useState, useCallback } from 'react';
import { Stack, Text } from 'doom-design-system';
import { TimeRangePicker } from './TimeRangePicker';
import { SpendingChart } from './SpendingChart';
import { CashFlowChart } from './CashFlowChart';
import { RecurringCharges } from './RecurringCharges';
import { getSpendingByCategory, getCashFlow, getRecurringCharges } from '@/app/actions/analytics';
import type { CategorySpending, CashFlowPeriod } from '@/lib/analytics';
import type { RecurringCharge } from '@/lib/recurring';

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

  return (
    <Stack gap={6}>
      <TimeRangePicker onChange={fetchData} />
      {loading ? (
        <Text color="muted">Loading...</Text>
      ) : (
        <Stack gap={6}>
          <SpendingChart
            data={spending}
            total={spending.reduce((sum, c) => sum + c.amount, 0)}
          />
          <CashFlowChart data={cashFlowData} />
          <RecurringCharges charges={recurring} />
        </Stack>
      )}
    </Stack>
  );
}
