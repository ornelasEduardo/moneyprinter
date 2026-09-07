import { describe, it, expect } from 'vitest';
import { mortgageMath, assessMortgage, mortgagePlanSchema, type MortgageInputs } from './mortgage';
import { createSnapshotContext } from './context';

const base: MortgageInputs = {
  homePrice: 400000, downPayment: 80000, annualRatePct: 6, termYears: 30,
  propertyTaxAnnual: 4800, homeInsuranceAnnual: 1200, hoaMonthly: 0,
  pmiMonthly: 0, existingMonthlyDebt: 0,
};

describe('mortgageMath', () => {
  it('computes P&I via the amortization formula', () => {
    const m = mortgageMath(base); // loan 320000 @ 6%/30y
    expect(m.loanAmount).toBe(320000);
    expect(Math.round(m.principalAndInterest)).toBe(1919); // ~$1,918.56
  });

  it('handles 0% interest as principal / months', () => {
    const m = mortgageMath({ ...base, annualRatePct: 0 });
    expect(m.principalAndInterest).toBeCloseTo(320000 / 360, 2);
  });

  it('monthlyPayment adds taxes, insurance, HOA, PMI (PITI)', () => {
    const m = mortgageMath({ ...base, hoaMonthly: 150, pmiMonthly: 100 });
    // P&I + 400 tax + 100 ins + 150 hoa + 100 pmi
    expect(Math.round(m.monthlyPayment)).toBe(Math.round(m.principalAndInterest + 400 + 100 + 150 + 100));
  });

  it('totalInterest = P&I * n - loan', () => {
    const m = mortgageMath(base);
    expect(Math.round(m.totalInterest)).toBe(Math.round(m.principalAndInterest * 360 - 320000));
  });

  it('rounds money outputs to cents', () => {
    const m = mortgageMath(base);
    for (const v of [m.loanAmount, m.principalAndInterest, m.monthlyPayment, m.totalInterest]) {
      expect(v).toBeCloseTo(Math.round(v * 100) / 100, 10);
    }
  });

  it('downPayment == homePrice yields zero principal and zero interest', () => {
    const m = mortgageMath({ ...base, downPayment: base.homePrice, hoaMonthly: 150, pmiMonthly: 100 });
    expect(m.loanAmount).toBe(0);
    expect(m.principalAndInterest).toBe(0);
    expect(m.totalInterest).toBe(0);
    // escrow only: 4800/12 + 1200/12 + 150 + 100
    expect(m.monthlyPayment).toBe(750);
  });

  it('computes P&I correctly for an extreme (40-year) term', () => {
    const m = mortgageMath({ ...base, termYears: 40 });
    // loan 320000 @ 6%/40y -> raw 1760.6836499329706
    expect(m.principalAndInterest).toBe(1760.68);
  });
});

const ctx = (over: Record<string, unknown> = {}) =>
  createSnapshotContext({
    monthlyIncome: 8000,
    monthlySurplus: 2500,
    liquidBalance: 50000,
    netWorth: 120000,
    colThresholds: { front: 0.28, back: 0.36 },
    ...over,
  });

describe('assessMortgage', () => {
  it('computes front/back DTI against income', async () => {
    const m = mortgageMath(base);
    const a = await assessMortgage({ ...m, monthlyPayment: 2400 }, { ...base, existingMonthlyDebt: 400 }, ctx());
    expect(a.frontEndDTI).toBeCloseTo(2400 / 8000, 3);
    expect(a.backEndDTI).toBeCloseTo(2800 / 8000, 3);
  });

  it('guards zero income (no divide-by-zero)', async () => {
    const m = mortgageMath(base);
    const a = await assessMortgage(m, base, ctx({ monthlyIncome: 0 }));
    expect(Number.isFinite(a.frontEndDTI)).toBe(true);
    expect(a.frontEndDTI).toBe(0);
  });

  it('monthsToDownPayment is 0 when liquid already covers it', async () => {
    const m = mortgageMath(base);
    const a = await assessMortgage(m, base, ctx({ liquidBalance: 100000 }));
    expect(a.monthsToDownPayment).toBe(0);
  });

  it('monthsToDownPayment is null when surplus is non-positive and a shortfall exists', async () => {
    const m = mortgageMath(base);
    const a = await assessMortgage(m, base, ctx({ liquidBalance: 0, monthlySurplus: -100 }));
    expect(a.monthsToDownPayment).toBeNull();
  });

  it('verdict uses both ratios: comfortable needs front<=cap AND back<=cap', async () => {
    const m = mortgageMath(base);
    // base has existingMonthlyDebt 0, so back == front here
    expect((await assessMortgage({ ...m, monthlyPayment: 2000 }, base, ctx())).verdict).toBe('comfortable'); // 0.25 / 0.25
    expect((await assessMortgage({ ...m, monthlyPayment: 2800 }, base, ctx())).verdict).toBe('stretch');     // 0.35 front>0.28, back 0.35<=0.36
    expect((await assessMortgage({ ...m, monthlyPayment: 3600 }, base, ctx())).verdict).toBe('over');        // 0.45 back>0.36
  });

  it('back-end DTI gates the verdict: low front but high existing debt is over, not comfortable', async () => {
    const m = mortgageMath(base);
    // payment 2000 -> front 0.25 (<=0.28); existing debt 2200 -> back 0.525 (>0.36)
    const a = await assessMortgage({ ...m, monthlyPayment: 2000 }, { ...base, existingMonthlyDebt: 2200 }, ctx());
    expect(a.frontEndDTI).toBeCloseTo(0.25, 3);
    expect(a.verdict).toBe('over');
  });

  it('stretch when front exceeds cap but back-end still within cap', async () => {
    const m = mortgageMath(base);
    // payment 2600 -> front 0.325 (>0.28); existing debt 0 -> back 0.325 (<=0.36)
    expect((await assessMortgage({ ...m, monthlyPayment: 2600 }, base, ctx())).verdict).toBe('stretch');
  });

  it('comfortable at the exact national boundary (front 0.28 AND back 0.36, inclusive)', async () => {
    const m = mortgageMath(base);
    // payment 2240 -> front 0.28; + existing debt 640 -> back 0.36
    const a = await assessMortgage({ ...m, monthlyPayment: 2240 }, { ...base, existingMonthlyDebt: 640 }, ctx());
    expect(a.frontEndDTI).toBeCloseTo(0.28, 3);
    expect(a.backEndDTI).toBeCloseTo(0.36, 3);
    expect(a.verdict).toBe('comfortable');
  });

  it('VHCOL caps (0.43/0.52) make an SF-scale plan comfortable that national rejects', async () => {
    const m = mortgageMath(base);
    const inputs = { ...base, existingMonthlyDebt: 480 };
    // payment 3200 -> front 0.40; back (3200+480)/8000 = 0.46
    expect((await assessMortgage({ ...m, monthlyPayment: 3200 }, inputs, ctx())).verdict).toBe('over');            // national 0.28/0.36
    expect((await assessMortgage({ ...m, monthlyPayment: 3200 }, inputs, ctx({ colThresholds: { front: 0.43, back: 0.52 } }))).verdict).toBe('comfortable'); // VHCOL
  });
});

describe('mortgagePlanSchema', () => {
  it('rejects unknown keys (strict)', () => {
    expect(mortgagePlanSchema.safeParse({ ...base, bogus: 1 }).success).toBe(false);
  });
  it('rejects downPayment > homePrice', () => {
    expect(mortgagePlanSchema.safeParse({ ...base, downPayment: 500000 }).success).toBe(false);
  });
  it('accepts a valid input', () => {
    expect(mortgagePlanSchema.safeParse(base).success).toBe(true);
  });
});
