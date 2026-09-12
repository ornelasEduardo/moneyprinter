import { z } from 'zod';
import type { FinancialContext } from './context';
import { monthlyIncome, monthlySurplus, liquidBalance } from './signals';
import { colThresholds } from './col';
import type { PlanDefinition, PlanResult } from './registry';

export interface MortgageInputs {
  homePrice: number;
  downPayment: number;
  annualRatePct: number;
  termYears: number;
  propertyTaxAnnual: number;
  homeInsuranceAnnual: number;
  hoaMonthly: number;
  pmiMonthly: number;
  existingMonthlyDebt: number;
}

export interface MortgageMath {
  loanAmount: number;
  principalAndInterest: number;
  monthlyPayment: number;
  totalInterest: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function mortgageMath(inputs: MortgageInputs): MortgageMath {
  const loanAmount = Math.max(0, inputs.homePrice - inputs.downPayment);
  // Clamp so a fat-fingered rate/term (the calculator recomputes on every
  // keystroke, before the save-time schema bounds apply) can't overflow
  // Math.pow to Infinity and render "$NaN".
  const n = Math.min(Math.max(1, Math.round(inputs.termYears * 12)), 600);
  const r = Math.min(Math.max(inputs.annualRatePct, 0), 200) / 100 / 12;

  const pow = Math.pow(1 + r, n);
  const rawPI = r === 0 ? loanAmount / n : (loanAmount * r * pow) / (pow - 1);
  const principalAndInterest = Number.isFinite(rawPI) ? rawPI : 0;

  const escrow =
    inputs.propertyTaxAnnual / 12 +
    inputs.homeInsuranceAnnual / 12 +
    inputs.hoaMonthly +
    inputs.pmiMonthly;

  const monthlyPayment = principalAndInterest + escrow;
  const totalInterest = principalAndInterest * n - loanAmount;

  return {
    loanAmount: round2(loanAmount),
    principalAndInterest: round2(principalAndInterest),
    monthlyPayment: round2(monthlyPayment),
    totalInterest: round2(totalInterest),
  };
}

export interface MortgageAssessment {
  frontEndDTI: number;
  backEndDTI: number;
  surplusAfterPayment: number;
  monthsToDownPayment: number | null;
  verdict: 'comfortable' | 'stretch' | 'over';
}

export async function assessMortgage(
  math: MortgageMath,
  inputs: MortgageInputs,
  ctx: FinancialContext,
): Promise<MortgageAssessment> {
  const income = await ctx.get(monthlyIncome);
  const surplus = await ctx.get(monthlySurplus);
  const liquid = await ctx.get(liquidBalance);
  const caps = await ctx.get(colThresholds);

  const frontEndDTI = income > 0 ? math.monthlyPayment / income : 0;
  const backEndDTI = income > 0 ? (math.monthlyPayment + inputs.existingMonthlyDebt) / income : 0;
  const surplusAfterPayment = Math.round((surplus - math.monthlyPayment) * 100) / 100;

  const shortfall = inputs.downPayment - liquid;
  let monthsToDownPayment: number | null;
  if (shortfall <= 0) monthsToDownPayment = 0;
  else if (surplus <= 0) monthsToDownPayment = null;
  else monthsToDownPayment = Math.ceil(shortfall / surplus);

  // Back-end is the binding constraint (backEndDTI >= frontEndDTI): comfortable
  // requires both ratios within cap; stretch tolerates an over-cap front as long
  // as total debt load stays within the back cap; otherwise over.
  const verdict =
    income <= 0
      ? 'over' // no income to service the payment — never "comfortable"
      : frontEndDTI <= caps.front && backEndDTI <= caps.back
        ? 'comfortable'
        : backEndDTI <= caps.back
          ? 'stretch'
          : 'over';

  return { frontEndDTI, backEndDTI, surplusAfterPayment, monthsToDownPayment, verdict };
}

export const mortgagePlanSchema = z
  .object({
    homePrice: z.number().positive(),
    downPayment: z.number().min(0),
    annualRatePct: z.number().min(0).max(100),
    termYears: z.number().int().positive().max(50),
    propertyTaxAnnual: z.number().min(0),
    homeInsuranceAnnual: z.number().min(0),
    hoaMonthly: z.number().min(0),
    pmiMonthly: z.number().min(0),
    existingMonthlyDebt: z.number().min(0),
  })
  .strict()
  .refine((v) => v.downPayment <= v.homePrice, {
    message: 'Down payment cannot exceed home price',
    path: ['downPayment'],
  });

export const mortgageDefinition: PlanDefinition<MortgageInputs> = {
  kind: 'mortgage',
  label: 'Mortgage',
  schema: mortgagePlanSchema,
  async defaults(ctx) {
    const liquid = await ctx.get(liquidBalance);
    const homePrice = 400000;
    return {
      homePrice,
      downPayment: Math.min(Math.round(homePrice * 0.2), Math.max(0, Math.round(liquid))),
      annualRatePct: 6.5,
      termYears: 30,
      propertyTaxAnnual: Math.round(homePrice * 0.012),
      homeInsuranceAnnual: 1200,
      hoaMonthly: 0,
      pmiMonthly: 0,
      existingMonthlyDebt: 0,
    };
  },
  async compute(inputs, ctx): Promise<PlanResult> {
    const math = mortgageMath(inputs);
    const assessment = await assessMortgage(math, inputs, ctx);
    return { math, assessment };
  },
  toGoal(inputs) {
    return { targetAmount: inputs.downPayment, suggestedName: 'House down payment' };
  },
};
