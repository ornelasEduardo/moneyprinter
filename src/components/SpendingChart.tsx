'use client';

import { useState } from 'react';
import { Card, Flex, Stack, Text } from 'doom-design-system';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { CategorySpending } from '@/lib/analytics';
import styles from './SpendingChart.module.scss';

const COLORS = [
  'var(--primary)',
  'var(--secondary)',
  'var(--success)',
  'var(--warning)',
  'var(--error)',
  'var(--accent)',
  'var(--muted)',
];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

interface SpendingChartProps {
  data: CategorySpending[];
  total: number;
}

export function SpendingChart({ data, total }: SpendingChartProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <Card>
        <Stack gap={3}>
          <Text variant="h5" weight="bold">Spending by Category</Text>
          <Text color="muted">No spending data for this period</Text>
        </Stack>
      </Card>
    );
  }

  const maxAmount = data[0]?.amount ?? 0;

  return (
    <Card>
      <Stack gap={4}>
        <Flex align="baseline" justify="space-between">
          <Text variant="h5" weight="bold">Spending by Category</Text>
          <Text variant="small" color="muted">{formatCurrency(total)} total</Text>
        </Flex>

        <Stack gap={0}>
          {data.map((cat, i) => {
            const isExpanded = expandedCategory === cat.category;
            const barWidth = maxAmount > 0 ? (cat.amount / maxAmount) * 100 : 0;
            const color = COLORS[i % COLORS.length];

            return (
              <div key={cat.category}>
                <button
                  className={styles.categoryRow}
                  onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}
                >
                  <Flex align="center" gap={2} style={{ flex: 1, minWidth: 0 }}>
                    {cat.merchants.length > 1 ? (
                      isExpanded
                        ? <ChevronDown size={14} strokeWidth={2.5} className={styles.chevron} />
                        : <ChevronRight size={14} strokeWidth={2.5} className={styles.chevron} />
                    ) : (
                      <div style={{ width: 14 }} />
                    )}
                    <Text variant="small" style={{ textTransform: 'capitalize', minWidth: 100 }}>
                      {cat.category}
                    </Text>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${barWidth}%`, backgroundColor: color }}
                      />
                    </div>
                  </Flex>
                  <Flex align="center" gap={3} style={{ flexShrink: 0 }}>
                    <Text variant="small" weight="bold">{formatCurrency(cat.amount)}</Text>
                    <Text variant="caption" color="muted" style={{ width: 36, textAlign: 'right' }}>
                      {Math.round(cat.percentage)}%
                    </Text>
                  </Flex>
                </button>

                {isExpanded && cat.merchants.length > 1 && (
                  <div className={styles.merchantList}>
                    {cat.merchants.map((m) => (
                      <Flex key={m.merchant} align="center" className={styles.merchantRow}>
                        <Text variant="caption" color="muted" style={{ flex: 1 }}>{m.merchant}</Text>
                        <Text variant="caption" weight="bold">{formatCurrency(m.amount)}</Text>
                        <Text variant="caption" color="muted" style={{ width: 50, textAlign: 'right' }}>
                          {m.count}x
                        </Text>
                      </Flex>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </Stack>
      </Stack>
    </Card>
  );
}
