import { describe, it, expect } from 'vitest';
import { normalizeMerchant, detectInterval, detectRecurring, type Frequency, type RecurringCharge } from './recurring';
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
