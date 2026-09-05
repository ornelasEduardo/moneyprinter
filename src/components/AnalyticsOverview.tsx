'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card, Container, Stack, Text, Flex, Combobox } from 'doom-design-system';
import { TimeRangePicker } from './TimeRangePicker';
import { SpendingChart } from './SpendingChart';
import { CashFlowChart } from './CashFlowChart';
import { RecurringCharges } from './RecurringCharges';
import { SpendingAnomalies } from './SpendingAnomalies';
import { NetWorthTrend } from './NetWorthTrend';
import {
  getSpendingByCategory, getCashFlow, getRecurringCharges,
  getSpendingAnomalies, getNetWorthTrend, getSpendingFilterOptions,
} from '@/app/actions/analytics';
import type { CategorySpending, CashFlowPeriod, SpendingAnomaly } from '@/lib/analytics';
import type { RecurringCharge } from '@/lib/recurring';
import { projectNetWorth, type NetWorthPoint, type ProjectedPoint } from '@/lib/projection';
import styles from './AnalyticsOverview.module.scss';

const PROJECTION_HORIZON_MONTHS = 12;

interface NetWorthState {
  history: NetWorthPoint[];
  projections: { regression: ProjectedPoint[]; savingsRate: ProjectedPoint[] };
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function AnalyticsOverview() {
  const [spending, setSpending] = useState<CategorySpending[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowPeriod[]>([]);
  const [recurring, setRecurring] = useState<RecurringCharge[]>([]);
  const [anomalies, setAnomalies] = useState<SpendingAnomaly[]>([]);
  const [netWorth, setNetWorth] = useState<NetWorthState>({
    history: [], projections: { regression: [], savingsRate: [] },
  });
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // Monotonic id so a slow spending refetch can't overwrite a newer one.
  const spendingReqId = useRef(0);
  const [filterOptions, setFilterOptions] = useState<{ accounts: { id: number; name: string }[]; tags: string[] }>({ accounts: [], tags: [] });
  const [accountIds, setAccountIds] = useState<number[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [range, setRange] = useState<{ start: Date; end: Date } | null>(null);

  useEffect(() => {
    getSpendingFilterOptions().then(setFilterOptions).catch(() => {});
  }, []);

  const fetchData = useCallback(async (start: Date, end: Date, accIds: number[] = accountIds, tagList: string[] = tags) => {
    setRange({ start, end });
    setLoading(true);
    try {
      const [spendingResult, cashFlowResult, recurringResult, anomalyResult, nwResult] = await Promise.all([
        getSpendingByCategory(start, end, { accountIds: accIds, tags: tagList }),
        getCashFlow(start, end, 'month'),
        getRecurringCharges(start, end),
        getSpendingAnomalies(start, end),
        getNetWorthTrend(start, end),
      ]);
      // Derive the projection from the cash flow we already fetched, rather than
      // re-querying transactions server-side just to recompute the savings rate.
      const monthlySavingsRate = cashFlowResult.length > 0
        ? cashFlowResult.reduce((s, d) => s + d.net, 0) / cashFlowResult.length
        : 0;
      const opts = { monthlySavingsRate, horizonMonths: PROJECTION_HORIZON_MONTHS };
      setSpending(spendingResult);
      setCashFlowData(cashFlowResult);
      setRecurring(recurringResult);
      setAnomalies(anomalyResult);
      setNetWorth({
        history: nwResult.history,
        projections: {
          regression: projectNetWorth(nwResult.history, { ...opts, mode: 'regression' }),
          savingsRate: projectNetWorth(nwResult.history, { ...opts, mode: 'savings-rate' }),
        },
      });
      // Only mark loaded once real data is in — otherwise the headline would
      // reveal misleading zeros (the very flash the gate exists to prevent).
      setLoadError(false);
      setHasLoaded(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [accountIds, tags]);

  // Filter changes scope only the spending breakdown, so they refetch spending
  // alone (leaving the rest of the dashboard, and its 'Updating…' state, untouched).
  const applyFilters = useCallback(async (nextAccountIds: number[], nextTags: string[]) => {
    setAccountIds(nextAccountIds);
    setTags(nextTags);
    if (!range) return;
    const reqId = ++spendingReqId.current;
    const result = await getSpendingByCategory(range.start, range.end, {
      accountIds: nextAccountIds,
      tags: nextTags,
    });
    // Drop stale responses so rapid toggles can't leave an older filter's data.
    if (reqId === spendingReqId.current) setSpending(result);
  }, [range]);

  const totals = useMemo(() => {
    // `spending` sums per category, so multi-tag transactions count once per tag
    // and it is filter-scoped — fine for the breakdown chart's own total, but the
    // headline must describe the whole period, so its Spent comes from cash flow.
    const breakdownTotal = spending.reduce((sum, c) => sum + c.amount, 0);
    const totalIncome = cashFlowData.reduce((sum, d) => sum + d.income, 0);
    const totalExpenses = cashFlowData.reduce((sum, d) => sum + d.expenses, 0);
    const totalNet = cashFlowData.reduce((sum, d) => sum + d.net, 0);
    const savingsRate = totalIncome > 0 ? Math.round((totalNet / totalIncome) * 100) : 0;
    return { breakdownTotal, totalIncome, totalExpenses, totalNet, savingsRate };
  }, [spending, cashFlowData]);

  return (
    <Container maxWidth="lg">
      <Stack gap={6}>
        {/* Header */}
        <Flex align="center" justify="space-between" wrap gap={3}>
          <Text variant="h4" weight="bold">Overview</Text>
          <TimeRangePicker onChange={fetchData} />
        </Flex>

        {loading && <Text color="muted">Updating…</Text>}

        <Stack gap={6}>
            {/* Savings rate headline — values are withheld until the first load
                resolves so we never flash a misleading 0% / $0 for an account
                that actually has data. */}
            <Card className={styles.savingsCard}>
              {hasLoaded ? (
                <Flex align="center" justify="space-between" wrap gap={4}>
                  <Stack gap={0}>
                    <Text variant="caption" color="muted">Savings rate</Text>
                    <Flex align="baseline" gap={2}>
                      <Text
                        variant="h2"
                        weight="black"
                        style={{ color: totals.totalNet >= 0 ? 'var(--success)' : 'var(--error)' }}
                      >
                        {totals.savingsRate}%
                      </Text>
                      <Text variant="small" color="muted" data-testid="sc-net">
                        {totals.totalNet >= 0 ? 'saved' : 'overspent'} {formatCurrency(Math.abs(totals.totalNet))}
                      </Text>
                    </Flex>
                  </Stack>
                  <Flex gap={6} align="baseline">
                    <Stack gap={0}>
                      <Text variant="caption" color="muted">Earned</Text>
                      <Text weight="bold" data-testid="sc-earned">{formatCurrency(totals.totalIncome)}</Text>
                    </Stack>
                    <Stack gap={0}>
                      <Text variant="caption" color="muted">Spent</Text>
                      <Text weight="bold" data-testid="sc-spent">{formatCurrency(totals.totalExpenses)}</Text>
                    </Stack>
                  </Flex>
                </Flex>
              ) : loadError ? (
                <Text color="muted" data-testid="sc-error">Couldn’t load your overview. Try again.</Text>
              ) : (
                <Text color="muted">Loading your overview…</Text>
              )}
            </Card>

            {/* Anomaly callouts */}
            <SpendingAnomalies anomalies={anomalies} />

            {/* Spending breakdown */}
            <Stack gap={3}>
              <Flex gap={3} wrap align="center">
                <Combobox
                  options={filterOptions.accounts.map((a) => ({ value: String(a.id), label: a.name }))}
                  value={accountIds.map(String)}
                  onChange={(v) => {
                    const next = (Array.isArray(v) ? v : v ? [v] : []).map(Number);
                    applyFilters(next, tags);
                  }}
                  multiple
                  searchable
                  placeholder="All accounts"
                  size="sm"
                />
                <Combobox
                  options={filterOptions.tags.map((t) => ({ value: t, label: t }))}
                  value={tags}
                  onChange={(v) => {
                    const next = Array.isArray(v) ? v : v ? [v] : [];
                    applyFilters(accountIds, next);
                  }}
                  multiple
                  searchable
                  placeholder="All tags"
                  size="sm"
                />
              </Flex>
              <SpendingChart data={spending} total={totals.breakdownTotal} />
            </Stack>

            {/* Cash flow */}
            <CashFlowChart data={cashFlowData} />

            {/* Net worth trend */}
            <NetWorthTrend data={netWorth.history} projections={netWorth.projections} />

            {/* Recurring */}
            <RecurringCharges charges={recurring} />
        </Stack>
      </Stack>
    </Container>
  );
}
