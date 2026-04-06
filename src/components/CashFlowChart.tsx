'use client';

import { Card, Chart, Flex, Stack, Text, Badge } from 'doom-design-system';
import type { CashFlowPeriod } from '@/lib/analytics';

interface CashFlowChartProps {
  data: CashFlowPeriod[];
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

function formatPeriodLabel(period: string): string {
  const [year, month] = period.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

interface ChartDatum {
  period: string;
  type: 'Income' | 'Expenses';
  amount: number;
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <Stack gap={3}>
          <Text variant="h5" weight="bold">Cash Flow</Text>
          <Text color="muted">No cash flow data for this period</Text>
        </Stack>
      </Card>
    );
  }

  const totalNet = data.reduce((sum, d) => sum + d.net, 0);
  const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
  const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0);

  const chartData: ChartDatum[] = data.flatMap((d) => [
    { period: formatPeriodLabel(d.period), type: 'Income', amount: d.income },
    { period: formatPeriodLabel(d.period), type: 'Expenses', amount: d.expenses },
  ]);

  const incomeData = chartData.filter((d) => d.type === 'Income');
  const expensesData = chartData.filter((d) => d.type === 'Expenses');

  return (
    <Card>
      <Stack gap={4}>
        <Stack gap={2}>
          <Text variant="h5" weight="bold">Cash Flow</Text>
          <Flex gap={2} wrap>
            <Badge variant="success">{formatCurrency(totalIncome)} in</Badge>
            <Badge variant="error">{formatCurrency(totalExpenses)} out</Badge>
            <Badge variant={totalNet >= 0 ? 'success' : 'error'}>
              {totalNet >= 0 ? '+' : ''}{formatCurrency(totalNet)} net
            </Badge>
          </Flex>
        </Stack>
        <div style={{ height: 300, minHeight: 200 }}>
          <Chart
            data={chartData}
            type="bar"
            x={(d: ChartDatum) => d.period}
            y={(d: ChartDatum) => d.amount}
          >
            <Chart.Series
              data={incomeData}
              type="bar"
              label="Income"
              color="var(--success)"
              x={(d: ChartDatum) => d.period}
              y={(d: ChartDatum) => d.amount}
            />
            <Chart.Series
              data={expensesData}
              type="bar"
              label="Expenses"
              color="var(--error)"
              x={(d: ChartDatum) => d.period}
              y={(d: ChartDatum) => d.amount}
            />
            <Chart.Axis />
            <Chart.Grid />
            <Chart.Cursor />
          </Chart>
        </div>
      </Stack>
    </Card>
  );
}
