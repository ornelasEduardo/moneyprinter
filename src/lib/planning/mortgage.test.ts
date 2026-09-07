import { describe, it, expect } from 'vitest';
import { mortgageMath, type MortgageInputs } from './mortgage';

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
