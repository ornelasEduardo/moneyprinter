import { describe, it, expect } from 'vitest';
import { linearRegression, projectNetWorth } from './projection';

describe('linearRegression', () => {
  it('fits a perfect line y = 2x + 1', () => {
    const { slope, intercept } = linearRegression([
      { x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 },
    ]);
    expect(slope).toBeCloseTo(2);
    expect(intercept).toBeCloseTo(1);
  });

  it('returns slope 0 for a flat line', () => {
    const { slope } = linearRegression([{ x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }]);
    expect(slope).toBeCloseTo(0);
  });

  it('handles a single point (slope 0, intercept = y)', () => {
    expect(linearRegression([{ x: 4, y: 9 }])).toEqual({ slope: 0, intercept: 9 });
  });

  it('handles identical x values without dividing by zero', () => {
    const { slope, intercept } = linearRegression([{ x: 3, y: 2 }, { x: 3, y: 4 }]);
    expect(slope).toBe(0);
    expect(intercept).toBeCloseTo(3);
  });

  it('fits a negative slope', () => {
    const { slope } = linearRegression([{ x: 0, y: 10 }, { x: 1, y: 8 }, { x: 2, y: 6 }]);
    expect(slope).toBeCloseTo(-2);
  });
});

describe('projectNetWorth', () => {
  const history = [
    { date: '2026-01-01', netWorth: 1000 },
    { date: '2026-02-01', netWorth: 2000 },
    { date: '2026-03-01', netWorth: 3000 },
  ];

  it('returns empty for fewer than 2 history points', () => {
    expect(projectNetWorth([{ date: '2026-01-01', netWorth: 1 }], { mode: 'regression', monthlySavingsRate: 0, horizonMonths: 12 })).toEqual([]);
  });

  it('produces exactly horizonMonths projected points, all flagged projected', () => {
    const out = projectNetWorth(history, { mode: 'regression', monthlySavingsRate: 0, horizonMonths: 12 });
    expect(out).toHaveLength(12);
    expect(out.every((p) => p.projected)).toBe(true);
  });

  it('regression extrapolates an upward trend', () => {
    const out = projectNetWorth(history, { mode: 'regression', monthlySavingsRate: 0, horizonMonths: 3 });
    expect(out[0].netWorth).toBeGreaterThan(3000);
    expect(out[2].netWorth).toBeGreaterThan(out[0].netWorth);
  });

  it('savings-rate mode adds rate per month from the latest value', () => {
    const out = projectNetWorth(history, { mode: 'savings-rate', monthlySavingsRate: 500, horizonMonths: 2 });
    expect(out[0].netWorth).toBeCloseTo(3500);
    expect(out[1].netWorth).toBeCloseTo(4000);
  });

  it('savings-rate mode with zero rate stays flat at the latest value', () => {
    const out = projectNetWorth(history, { mode: 'savings-rate', monthlySavingsRate: 0, horizonMonths: 3 });
    expect(out.every((p) => p.netWorth === 3000)).toBe(true);
  });

  it('savings-rate mode with a negative rate declines', () => {
    const out = projectNetWorth(history, { mode: 'savings-rate', monthlySavingsRate: -200, horizonMonths: 2 });
    expect(out[0].netWorth).toBeCloseTo(2800);
    expect(out[1].netWorth).toBeCloseTo(2600);
  });

  it('regression handles very small slopes correctly (precision)', () => {
    // 50-year history with minimal growth should project forward
    const history50yr = [
      { date: '2000-01-01', netWorth: 100000 },
      { date: '2050-01-01', netWorth: 100500 },
    ];
    const out = projectNetWorth(history50yr, { mode: 'regression', monthlySavingsRate: 0, horizonMonths: 1 });
    expect(out).toHaveLength(1);
    expect(out[0].netWorth).toBeGreaterThan(100500);
  });

  it('month-end: Jan 31 + 1 month should clamp to Feb 29 (leap year), not overflow to Mar 2', () => {
    const history_jan31 = [
      { date: '2024-01-01', netWorth: 1000 },
      { date: '2024-01-31', netWorth: 2000 },
    ];
    const out = projectNetWorth(history_jan31, { mode: 'savings-rate', monthlySavingsRate: 0, horizonMonths: 1 });
    // +1 month from Jan 31 (leap year) should be Feb 29, not Mar 2
    expect(out[0].date).toBe('2024-02-29');
  });

  it('month-end: Jan 31 + 1 month non-leap (should clamp to Feb 28)', () => {
    const history_jan31_non_leap = [
      { date: '2023-01-01', netWorth: 1000 },
      { date: '2023-01-31', netWorth: 2000 },
    ];
    const out = projectNetWorth(history_jan31_non_leap, { mode: 'savings-rate', monthlySavingsRate: 0, horizonMonths: 1 });
    // +1 month from Jan 31 (non-leap year) should be Feb 28, not Mar 2/3
    expect(out[0].date).toBe('2023-02-28');
  });

  it('month-end: May 31 + 1 month should clamp to Jun 30, not overflow', () => {
    const history_may31 = [
      { date: '2024-05-01', netWorth: 1000 },
      { date: '2024-05-31', netWorth: 2000 },
    ];
    const out = projectNetWorth(history_may31, { mode: 'savings-rate', monthlySavingsRate: 0, horizonMonths: 1 });
    // +1 month from May 31 should be Jun 30 (June has 30 days), not Jul 1
    expect(out[0].date).toBe('2024-06-30');
  });
});
