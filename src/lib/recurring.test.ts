import { describe, it, expect } from 'vitest';
import {
  normalizeMerchant,
  detectInterval,
  detectRecurring,
  buildPlateaus,
  classifyKind,
  detectPriceIncrease,
} from './recurring';
import type { Transaction } from './analytics';

describe('normalizeMerchant', () => {
  it('should lowercase and trim', () => {
    expect(normalizeMerchant('  Netflix  ')).toBe('netflix');
  });

  it('should strip common suffixes', () => {
    expect(normalizeMerchant('NETFLIX.COM INC')).toBe('netflix');
    expect(normalizeMerchant('Amazon LLC')).toBe('amazon');
    expect(normalizeMerchant('Spotify Co')).toBe('spotify');
  });

  it('should strip .com', () => {
    expect(normalizeMerchant('hulu.com')).toBe('hulu');
  });

  it('should strip trailing transaction IDs', () => {
    expect(normalizeMerchant('Whole Foods Market #1234')).toBe('whole foods market');
    expect(normalizeMerchant('Shell REF:ABC123')).toBe('shell');
  });

  it('should collapse multiple spaces', () => {
    expect(normalizeMerchant('Whole   Foods   Market')).toBe('whole foods market');
  });

  it('should handle combined patterns', () => {
    expect(normalizeMerchant('AT&T WIRELESS INC #5678')).toBe('at&t wireless');
  });
});

describe('detectInterval', () => {
  it('should detect monthly pattern', () => {
    const dates = [
      new Date('2026-01-15'),
      new Date('2026-02-15'),
      new Date('2026-03-15'),
      new Date('2026-04-14'),
    ];
    const result = detectInterval(dates);
    expect(result.frequency).toBe('monthly');
    expect(result.confidence).toBe('high');
  });

  it('should detect weekly pattern', () => {
    const dates = [
      new Date('2026-03-01'),
      new Date('2026-03-08'),
      new Date('2026-03-15'),
      new Date('2026-03-22'),
    ];
    const result = detectInterval(dates);
    expect(result.frequency).toBe('weekly');
    expect(result.confidence).toBe('high');
  });

  it('should detect quarterly pattern', () => {
    const dates = [
      new Date('2025-06-01'),
      new Date('2025-09-01'),
      new Date('2025-12-01'),
      new Date('2026-03-01'),
    ];
    const result = detectInterval(dates);
    expect(result.frequency).toBe('quarterly');
  });

  it('should return low confidence for irregular gaps', () => {
    const dates = [
      new Date('2026-01-05'),
      new Date('2026-01-20'),
      new Date('2026-03-10'),
      new Date('2026-03-25'),
    ];
    const result = detectInterval(dates);
    expect(result.confidence).toBe('low');
  });

  it('should require at least 3 dates', () => {
    const dates = [new Date('2026-01-01'), new Date('2026-02-01')];
    const result = detectInterval(dates);
    expect(result.frequency).toBeNull();
  });
});

const recurringTransactions: Transaction[] = [
  { id: 1, name: 'Netflix', amount: 15.99, date: '2026-01-03', type: 'expense', tags: null, accountId: 1 },
  { id: 2, name: 'NETFLIX.COM', amount: 15.99, date: '2026-02-03', type: 'expense', tags: null, accountId: 1 },
  { id: 3, name: 'Netflix Inc', amount: 15.99, date: '2026-03-03', type: 'expense', tags: null, accountId: 1 },
  { id: 4, name: 'Netflix', amount: 15.99, date: '2026-04-03', type: 'expense', tags: null, accountId: 1 },
  { id: 5, name: 'Planet Fitness', amount: 24.99, date: '2026-01-05', type: 'expense', tags: null, accountId: 1 },
  { id: 6, name: 'Planet Fitness', amount: 24.99, date: '2026-02-05', type: 'expense', tags: null, accountId: 1 },
  { id: 7, name: 'Planet Fitness', amount: 25.49, date: '2026-03-05', type: 'expense', tags: null, accountId: 1 },
  { id: 8, name: 'Amazon', amount: 47.99, date: '2026-02-14', type: 'expense', tags: null, accountId: 1 },
  { id: 9, name: 'Hulu', amount: 12.99, date: '2026-01-10', type: 'expense', tags: null, accountId: 1 },
  { id: 10, name: 'Hulu', amount: 12.99, date: '2026-02-10', type: 'expense', tags: null, accountId: 1 },
];

describe('detectRecurring', () => {
  it('should detect Netflix as monthly recurring', () => {
    const result = detectRecurring(recurringTransactions);
    const netflix = result.find((r) => r.name === 'netflix');
    expect(netflix).toBeDefined();
    expect(netflix!.frequency).toBe('monthly');
    expect(netflix!.amount).toBeCloseTo(15.99);
    expect(netflix!.transactions).toBe(4);
  });

  it('should detect Planet Fitness with amount tolerance', () => {
    const result = detectRecurring(recurringTransactions);
    const gym = result.find((r) => r.name === 'planet fitness');
    expect(gym).toBeDefined();
    expect(gym!.frequency).toBe('monthly');
    expect(gym!.transactions).toBe(3);
  });

  it('should not detect one-off transactions', () => {
    const result = detectRecurring(recurringTransactions);
    const amazon = result.find((r) => r.name === 'amazon');
    expect(amazon).toBeUndefined();
  });

  it('should not detect items with fewer than 3 occurrences', () => {
    const result = detectRecurring(recurringTransactions);
    const hulu = result.find((r) => r.name === 'hulu');
    expect(hulu).toBeUndefined();
  });

  it('should calculate nextExpected date', () => {
    const result = detectRecurring(recurringTransactions);
    const netflix = result.find((r) => r.name === 'netflix');
    expect(netflix!.nextExpected).toBeDefined();
    const next = new Date(netflix!.nextExpected);
    expect(next.getMonth()).toBe(4); // May
  });

  it('should only include high and medium confidence', () => {
    const result = detectRecurring(recurringTransactions);
    for (const charge of result) {
      expect(['high', 'medium']).toContain(charge.confidence);
    }
  });

  it('should exclude income transactions', () => {
    const txs: Transaction[] = [
      { id: 1, name: 'Paycheck', amount: 3200, date: '2026-01-15', type: 'income', tags: null, accountId: 1 },
      { id: 2, name: 'Paycheck', amount: 3200, date: '2026-02-15', type: 'income', tags: null, accountId: 1 },
      { id: 3, name: 'Paycheck', amount: 3200, date: '2026-03-15', type: 'income', tags: null, accountId: 1 },
    ];
    const result = detectRecurring(txs);
    expect(result).toHaveLength(0);
  });
});

// ── New pure-function tests ─────────────────────────────────────────────────

describe('buildPlateaus', () => {
  it('groups consecutive matching amounts into one plateau', () => {
    const p = buildPlateaus([15.99, 15.99, 15.99]);
    expect(p).toHaveLength(1);
    expect(p[0].count).toBe(3);
    expect(p[0].amount).toBeCloseTo(15.99);
  });

  it('splits when amount steps beyond tolerance', () => {
    const p = buildPlateaus([15.99, 15.99, 19.99, 19.99]);
    expect(p).toHaveLength(2);
    expect(p[1].amount).toBeCloseTo(19.99);
    expect(p[1].startIndex).toBe(2);
  });

  it('creates many plateaus for wandering amounts', () => {
    const p = buildPlateaus([80, 200, 95, 150, 60]);
    expect(p.length).toBeGreaterThan(3);
  });
});

describe('classifyKind', () => {
  it('classifies a single stable plateau as subscription', () => {
    expect(classifyKind(buildPlateaus([10, 10, 10]))).toBe('subscription');
  });

  it('classifies a single price step as subscription', () => {
    expect(classifyKind(buildPlateaus([10, 10, 12, 12]))).toBe('subscription');
  });

  it('classifies wandering amounts as variable', () => {
    expect(classifyKind(buildPlateaus([80, 200, 95, 150, 60]))).toBe('variable');
  });
});

describe('detectPriceIncrease', () => {
  const dates = (n: number) => Array.from({ length: n }, (_, i) => new Date(2026, i, 1));

  it('flags an increase between the last two plateaus', () => {
    const amounts = [15.99, 15.99, 19.99];
    const change = detectPriceIncrease(buildPlateaus(amounts), dates(3));
    expect(change).not.toBeNull();
    expect(change!.previousAmount).toBeCloseTo(15.99);
    expect(change!.currentAmount).toBeCloseTo(19.99);
    expect(change!.percentIncrease).toBeGreaterThan(0);
    expect(change!.changedAt).toEqual(new Date(2026, 2, 1));
  });

  it('returns null for a single stable plateau', () => {
    expect(detectPriceIncrease(buildPlateaus([10, 10, 10]), dates(3))).toBeNull();
  });

  it('ignores a price decrease', () => {
    expect(detectPriceIncrease(buildPlateaus([20, 20, 15]), dates(3))).toBeNull();
  });

  it('ignores a single outlier spike within tolerance runs', () => {
    // 10,10,10,50 → last plateau is the 50 outlier; still an increase, so this
    // documents that a lone final spike DOES register. A mid-series spike does not.
    const change = detectPriceIncrease(buildPlateaus([10, 50, 10]), dates(3));
    expect(change).toBeNull(); // last plateau (10) not greater than previous (50)
  });
});

// ── Adversarial tests ───────────────────────────────────────────────────────

describe('buildPlateaus — adversarial', () => {
  it('exact $1 floor: amounts within $1 always merge into one plateau', () => {
    // 19.99 → 20.99: |1.00| ≤ max(20.99*0.05=1.0495, 1) = 1.0495 → match
    const p = buildPlateaus([19.99, 20.99, 20.99]);
    expect(p).toHaveLength(1);
  });

  it('just over $1 floor splits into two plateaus for small amounts', () => {
    // 5.00 → 6.10: |1.10| > max(6.10*0.05=0.305, 1) = 1.0 → no match
    const p = buildPlateaus([5.00, 6.10, 6.10]);
    expect(p).toHaveLength(2);
  });

  it('5% threshold splits for large amounts', () => {
    // 100 → 106: tolerance = max(106*0.05=5.30, 1) = 5.30. |6| > 5.30 → no match
    const p = buildPlateaus([100.00, 106.00, 106.00]);
    expect(p).toHaveLength(2);
    expect(p[0].amount).toBeCloseTo(100.00);
    expect(p[1].amount).toBeCloseTo(106.00);
  });

  it('5% threshold matches for large amounts just within range', () => {
    // 100 → 105: tolerance = max(105*0.05=5.25, 1) = 5.25. |5| ≤ 5.25 → match
    const p = buildPlateaus([100.00, 105.00, 105.00]);
    expect(p).toHaveLength(1);
  });

  it('alternating very different amounts each form their own plateau', () => {
    // 80 and 200 differ by 120; no tolerance covers that
    const p = buildPlateaus([80, 200, 80, 200]);
    expect(p).toHaveLength(4);
  });

  it('lone final spike creates a second plateau (documents expected behavior)', () => {
    // [10,10,10,50] → plateau {10, count:3} then plateau {50, count:1}
    const p = buildPlateaus([10, 10, 10, 50]);
    expect(p).toHaveLength(2);
    expect(p[0].count).toBe(3);
    expect(p[1].amount).toBeCloseTo(50);
  });

  it('gradual drift accumulates into one plateau until it crosses tolerance', () => {
    // Running average slowly rises; the final jump breaks out into a new plateau.
    // [10, 10.5, 11, 11.5, 12] → 2 plateaus (known behavior, not a bug)
    const p = buildPlateaus([10.00, 10.50, 11.00, 11.50, 12.00]);
    expect(p).toHaveLength(2);
    // The last plateau is 12.00
    expect(p[p.length - 1].amount).toBeCloseTo(12.00);
  });

  it('hidden price hike within $1 floor is NOT reported (correct behavior)', () => {
    // [15.99, 16.99]: |1.00| ≤ max(16.99*0.05=0.8495, 1)=1 → same plateau
    // A $1 increase is indistinguishable from normal fluctuation by design.
    const p = buildPlateaus([15.99, 15.99, 16.99, 16.99]);
    // All within $1 of each other with running average — may be 1 or 2 plateaus
    // The key assertion: detectPriceIncrease must not flag a decrease
    const change = detectPriceIncrease(p, Array.from({ length: 4 }, (_, i) => new Date(2026, i, 1)));
    expect(change).toBeNull();
  });
});

describe('detectPriceIncrease — adversarial', () => {
  const dates = (n: number) => Array.from({ length: n }, (_, i) => new Date(2026, i, 1));

  it('lone final spike is reported as a price hike (documents expected behavior)', () => {
    // [10, 10, 10, 50] → last plateau 50 > prev plateau 10 → reports hike
    const change = detectPriceIncrease(buildPlateaus([10, 10, 10, 50]), dates(4));
    expect(change).not.toBeNull();
    expect(change!.currentAmount).toBeCloseTo(50);
    expect(change!.previousAmount).toBeCloseTo(10);
  });

  it('mid-series spike followed by return does NOT register as final hike', () => {
    // [10, 50, 10, 10, 10] → last plateau is 10, prev is 50 → 10 < 50 → null
    const change = detectPriceIncrease(buildPlateaus([10, 50, 10, 10, 10]), dates(5));
    expect(change).toBeNull();
  });

  it('multi-step escalation reports the most recent step', () => {
    // [10, 10, 15, 15, 20, 20] → 3 plateaus; checks last two (15→20)
    const change = detectPriceIncrease(buildPlateaus([10, 10, 15, 15, 20, 20]), dates(6));
    expect(change).not.toBeNull();
    expect(change!.previousAmount).toBeCloseTo(15);
    expect(change!.currentAmount).toBeCloseTo(20);
  });

  it('returns null when only one plateau exists', () => {
    expect(detectPriceIncrease(buildPlateaus([9.99]), dates(1))).toBeNull();
  });
});

describe('detectPriceIncrease — zero previousAmount guard', () => {
  it('returns percentIncrease of 0 (not Infinity) when previous plateau amount is 0', () => {
    // Plateau: [0, 0] then [5] — previousAmount is 0, currentAmount is 5.
    // Without the guard, (5 - 0) / 0 = Infinity.
    const plateaus = buildPlateaus([0, 0, 5]);
    const dates = [new Date(2026, 0, 1), new Date(2026, 1, 1), new Date(2026, 2, 1)];
    const change = detectPriceIncrease(plateaus, dates);
    expect(change).not.toBeNull();
    expect(isFinite(change!.percentIncrease)).toBe(true);
    expect(change!.percentIncrease).toBe(0);
  });
});

describe('classifyKind — adversarial', () => {
  it('alternating amounts → variable', () => {
    expect(classifyKind(buildPlateaus([80, 200, 80, 200]))).toBe('variable');
  });

  it('exactly 3 plateaus → subscription (boundary)', () => {
    // [10, 20, 30] each distinct and far apart → 3 plateaus → subscription
    expect(classifyKind(buildPlateaus([10, 20, 30]))).toBe('subscription');
  });

  it('4 plateaus → variable', () => {
    expect(classifyKind(buildPlateaus([10, 20, 30, 40]))).toBe('variable');
  });
});
