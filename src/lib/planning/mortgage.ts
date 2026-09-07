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
  const n = Math.max(1, Math.round(inputs.termYears * 12));
  const r = inputs.annualRatePct / 100 / 12;

  const principalAndInterest = r === 0
    ? loanAmount / n
    : (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

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
