import { describe, it, expect } from 'vitest';
import { planRegistry, planSchema } from './registry';

describe('plan registry', () => {
  it('exposes the mortgage definition under its kind', () => {
    expect(planRegistry.mortgage.kind).toBe('mortgage');
    expect(planRegistry.mortgage.label).toBe('Mortgage');
  });
  it('planSchema validates a mortgage plan and rejects unknown kinds', () => {
    const ok = planSchema.safeParse({
      plan_kind: 'mortgage',
      plan_inputs: { homePrice: 400000, downPayment: 80000, annualRatePct: 6, termYears: 30, propertyTaxAnnual: 4800, homeInsuranceAnnual: 1200, hoaMonthly: 0, pmiMonthly: 0, existingMonthlyDebt: 0 },
    });
    expect(ok.success).toBe(true);
    expect(planSchema.safeParse({ plan_kind: 'auto', plan_inputs: {} }).success).toBe(false);
  });
});
