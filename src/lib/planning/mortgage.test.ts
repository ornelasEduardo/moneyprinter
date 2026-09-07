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
});
