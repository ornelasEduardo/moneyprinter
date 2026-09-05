import type { Transaction } from './analytics';

// ── Merchant Normalization ───────────────────────────────

const STRIP_SUFFIXES = /\s+(inc|llc|co|ltd|corp|company)\.?$/i;
const STRIP_DOT_COM = /\.com$/i;
const STRIP_TRAILING_ID = /\s+(#\S+|ref:\S+)$/i;

export function normalizeMerchant(name: string): string {
  let normalized = name.toLowerCase().trim();
  normalized = normalized.replace(STRIP_TRAILING_ID, '');
  normalized = normalized.replace(STRIP_SUFFIXES, '');
  normalized = normalized.replace(STRIP_DOT_COM, '');
  normalized = normalized.replace(/\s+/g, ' ').trim();
  return normalized;
}

// ── Interval Detection ───────────────────────────────────

export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
export type Confidence = 'high' | 'medium' | 'low';

export type RecurringKind = 'subscription' | 'variable';

export interface PriceChange {
  previousAmount: number;
  currentAmount: number;
  changedAt: Date;
  percentIncrease: number;
}

export interface Plateau {
  amount: number;
  startIndex: number;
  endIndex: number;
  count: number;
}

interface IntervalResult {
  frequency: Frequency | null;
  confidence: Confidence;
}

const FREQUENCY_RANGES: { type: Frequency; min: number; max: number }[] = [
  { type: 'weekly', min: 6, max: 8 },
  { type: 'biweekly', min: 13, max: 16 },
  { type: 'monthly', min: 27, max: 34 },
  { type: 'quarterly', min: 85, max: 100 },
  { type: 'annual', min: 350, max: 380 },
];

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function coefficientOfVariation(values: number[]): number {
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  if (avg === 0) return Infinity;
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance) / avg;
}

export function detectInterval(dates: Date[]): IntervalResult {
  if (dates.length < 3) return { frequency: null, confidence: 'low' };

  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push((sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24));
  }

  const med = median(gaps);
  const match = FREQUENCY_RANGES.find((r) => med >= r.min && med <= r.max);
  if (!match) return { frequency: null, confidence: 'low' };

  const cv = coefficientOfVariation(gaps);
  const confidence: Confidence = cv < 0.1 ? 'high' : cv < 0.25 ? 'medium' : 'low';

  return { frequency: match.type, confidence };
}

// ── Recurring Detection ──────────────────────────────────

export interface RecurringCharge {
  name: string;
  amount: number;
  frequency: Frequency;
  confidence: Confidence;
  lastCharged: Date;
  nextExpected: Date;
  transactions: number;
  kind: RecurringKind;
  priceChange?: PriceChange;
}

const FREQUENCY_DAYS: Record<Frequency, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 91,
  annual: 365,
};

function amountsMatch(a: number, b: number): boolean {
  const tolerance = Math.max(a * 0.05, 1);
  return Math.abs(a - b) <= tolerance;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function buildPlateaus(amounts: number[]): Plateau[] {
  const plateaus: Plateau[] = [];
  for (let i = 0; i < amounts.length; i++) {
    const current = plateaus[plateaus.length - 1];
    if (current && amountsMatch(amounts[i], current.amount)) {
      const total = current.amount * current.count + amounts[i];
      current.count += 1;
      current.endIndex = i;
      current.amount = total / current.count;
    } else {
      plateaus.push({ amount: amounts[i], startIndex: i, endIndex: i, count: 1 });
    }
  }
  return plateaus;
}

export function classifyKind(plateaus: Plateau[]): RecurringKind {
  return plateaus.length <= 3 ? 'subscription' : 'variable';
}

export function detectPriceIncrease(plateaus: Plateau[], datesInOrder: Date[]): PriceChange | null {
  if (plateaus.length < 2) return null;
  const last = plateaus[plateaus.length - 1];
  const prev = plateaus[plateaus.length - 2];
  // tolerance scales with `last` (the newer amount); on an increase this is the larger value
  if (amountsMatch(last.amount, prev.amount)) return null;
  if (last.amount <= prev.amount) return null; // increases only
  const currentAmount = round2(last.amount);
  const previousAmount = round2(prev.amount);
  const percentIncrease = previousAmount > 0
    ? Math.round(((currentAmount - previousAmount) / previousAmount) * 1000) / 10
    : 0;
  return {
    previousAmount,
    currentAmount,
    changedAt: datesInOrder[last.startIndex],
    percentIncrease,
  };
}

export function detectRecurring(transactions: Transaction[]): RecurringCharge[] {
  const expenses = transactions.filter((t) => t.type === 'expense');

  const groups = new Map<string, Transaction[]>();
  for (const tx of expenses) {
    const key = normalizeMerchant(tx.name);
    const group = groups.get(key) ?? [];
    group.push(tx);
    groups.set(key, group);
  }

  const results: RecurringCharge[] = [];

  for (const [name, txs] of groups) {
    if (txs.length < 3) continue;

    const sorted = [...txs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const dates = sorted.map((t) => new Date(t.date));
    const interval = detectInterval(dates);
    if (!interval.frequency || interval.confidence === 'low') continue;

    const amounts = sorted.map((t) => t.amount);
    const plateaus = buildPlateaus(amounts);
    const kind = classifyKind(plateaus);
    const priceChange = detectPriceIncrease(plateaus, dates) ?? undefined;
    const currentAmount = plateaus[plateaus.length - 1].amount;

    const lastDate = dates[dates.length - 1];
    const nextExpected = new Date(lastDate);
    nextExpected.setDate(nextExpected.getDate() + FREQUENCY_DAYS[interval.frequency]);

    results.push({
      name,
      amount: round2(currentAmount),
      frequency: interval.frequency,
      confidence: interval.confidence,
      lastCharged: lastDate,
      nextExpected,
      transactions: sorted.length,
      kind,
      priceChange,
    });
  }

  return results.sort((a, b) => b.amount - a.amount);
}
