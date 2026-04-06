'use client';

import { useState, useCallback } from 'react';
import { Button, Card, Flex, Stack, Table, Text } from 'doom-design-system';
import { Download, FileBarChart } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { TimeRangePicker } from './TimeRangePicker';
import { getCashFlow, getSpendingByCategory } from '@/app/actions/analytics';
import type { CategorySpending, CashFlowPeriod } from '@/lib/analytics';
import styles from './AnalyticsReports.module.scss';

type ReportType = 'monthly-spending' | 'income-vs-expenses' | 'category-breakdown';

interface ReportDef {
  id: ReportType;
  name: string;
  description: string;
}

const REPORTS: ReportDef[] = [
  {
    id: 'monthly-spending',
    name: 'Monthly Spending Summary',
    description: 'Spending totals broken down by month and category. Good for spotting trends.',
  },
  {
    id: 'income-vs-expenses',
    name: 'Income vs Expenses',
    description: 'Monthly income and expenses side by side with net savings rate.',
  },
  {
    id: 'category-breakdown',
    name: 'Category Breakdown',
    description: 'How much you spent in each category with month-over-month comparison.',
  },
];

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export default function AnalyticsReports() {
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportColumns, setReportColumns] = useState<ColumnDef<any>[]>([]);
  const [loading, setLoading] = useState(false);

  const handleDateChange = useCallback((start: Date, end: Date) => {
    setDateRange({ start, end });
    setActiveReport(null);
    setReportData([]);
  }, []);

  const generateReport = useCallback(async (type: ReportType) => {
    if (!dateRange) return;
    setLoading(true);
    setActiveReport(type);

    try {
      switch (type) {
        case 'income-vs-expenses': {
          const data = await getCashFlow(dateRange.start, dateRange.end, 'month');
          setReportColumns([
            { accessorKey: 'period', header: 'Month' },
            { accessorKey: 'incomeFormatted', header: 'Income' },
            { accessorKey: 'expensesFormatted', header: 'Expenses' },
            { accessorKey: 'netFormatted', header: 'Net' },
            { accessorKey: 'savingsRate', header: 'Savings Rate' },
          ]);
          setReportData(data.map((d) => ({
            ...d,
            incomeFormatted: formatCurrency(d.income),
            expensesFormatted: formatCurrency(d.expenses),
            netFormatted: formatCurrency(d.net),
            savingsRate: d.income > 0 ? `${Math.round((d.net / d.income) * 100)}%` : '0%',
          })));
          break;
        }
        case 'monthly-spending':
        case 'category-breakdown': {
          const data = await getSpendingByCategory(dateRange.start, dateRange.end);
          setReportColumns([
            { accessorKey: 'category', header: 'Category' },
            { accessorKey: 'amountFormatted', header: 'Amount' },
            { accessorKey: 'percentageFormatted', header: '% of Total' },
          ]);
          setReportData(data.map((d) => ({
            ...d,
            amountFormatted: formatCurrency(d.amount),
            percentageFormatted: `${Math.round(d.percentage)}%`,
          })));
          break;
        }
      }
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const handleExportCsv = useCallback(() => {
    if (!activeReport || reportData.length === 0) return;
    const headers = reportColumns.map((c) => String((c as any).header));
    const keys = reportColumns.map((c) => (c as any).accessorKey);
    const rows = reportData.map((row) => keys.map((k: string) => String(row[k] ?? '')));
    downloadCsv(`${activeReport}-report.csv`, headers, rows);
  }, [activeReport, reportData, reportColumns]);

  return (
    <Stack gap={6}>
      <TimeRangePicker onChange={handleDateChange} defaultPreset="ytd" />

      <Stack gap={4}>
        {REPORTS.map((report) => (
          <Card key={report.id}>
            <Stack gap={3}>
              <Flex align="center" justify="space-between">
                <Stack gap={1}>
                  <Flex align="center" gap={2}>
                    <FileBarChart size={16} strokeWidth={2.5} />
                    <Text weight="bold">{report.name}</Text>
                  </Flex>
                  <Text variant="small" color="muted">{report.description}</Text>
                </Stack>
                <Flex gap={2}>
                  <Button
                    size="sm"
                    onClick={() => generateReport(report.id)}
                    disabled={loading || !dateRange}
                  >
                    Generate
                  </Button>
                  {activeReport === report.id && reportData.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={handleExportCsv}>
                      <Download size={14} strokeWidth={2.5} />
                      CSV
                    </Button>
                  )}
                </Flex>
              </Flex>

              {activeReport === report.id && reportData.length > 0 && (
                <Table
                  data={reportData}
                  columns={reportColumns}
                  variant="flat"
                  enableSorting
                />
              )}
            </Stack>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
