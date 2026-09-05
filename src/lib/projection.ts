export type ProjectionMode = 'regression' | 'savings-rate';

export interface NetWorthPoint {
  date: string;
  netWorth: number;
}

export interface ProjectedPoint {
  date: string;
  netWorth: number;
  projected: boolean;
}

export function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: points[0].y };

  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) {
    // all x identical → flat line at mean y
    return { slope: 0, intercept: sumY / n };
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function toDays(dateStr: string): number {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

function lastDayOfMonth(year: number, month: number): number {
  // month is 1-indexed (1=Jan, 12=Dec)
  // Get the first day of next month, then subtract 1 day
  const nextMonth = new Date(year, month, 0);
  return nextMonth.getDate();
}

function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  // Calculate target year and month
  const targetMonth = m + months;
  let targetYear = y;
  let targetMonthNormalized = targetMonth;

  // Handle month overflow/underflow
  while (targetMonthNormalized > 12) {
    targetYear += 1;
    targetMonthNormalized -= 12;
  }
  while (targetMonthNormalized < 1) {
    targetYear -= 1;
    targetMonthNormalized += 12;
  }

  // Clamp day to the last day of target month
  const lastDay = lastDayOfMonth(targetYear, targetMonthNormalized);
  const clampedDay = Math.min(d, lastDay);

  const dt = new Date(targetYear, targetMonthNormalized - 1, clampedDay);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function projectNetWorth(
  history: NetWorthPoint[],
  opts: { mode: ProjectionMode; monthlySavingsRate: number; horizonMonths: number },
): ProjectedPoint[] {
  if (history.length < 2) return [];

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  const result: ProjectedPoint[] = [];

  if (opts.mode === 'regression') {
    const originDays = toDays(sorted[0].date);
    const points = sorted.map((p) => ({ x: toDays(p.date) - originDays, y: p.netWorth }));
    const { slope, intercept } = linearRegression(points);
    for (let month = 1; month <= opts.horizonMonths; month++) {
      const date = addMonths(last.date, month);
      const x = toDays(date) - originDays;
      result.push({ date, netWorth: Math.round((slope * x + intercept) * 100) / 100, projected: true });
    }
  } else {
    for (let month = 1; month <= opts.horizonMonths; month++) {
      const date = addMonths(last.date, month);
      const value = last.netWorth + opts.monthlySavingsRate * month;
      result.push({ date, netWorth: Math.round(value * 100) / 100, projected: true });
    }
  }

  return result;
}
