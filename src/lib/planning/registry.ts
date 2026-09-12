import { z } from 'zod';
import type { FinancialContext } from './context';
import { mortgageDefinition, mortgagePlanSchema } from './mortgage';

export type PlanKind = 'mortgage';

export interface PlanResult {
  math: unknown;
  assessment: unknown;
}

export interface PlanDefinition<TInputs> {
  kind: PlanKind;
  label: string;
  schema: z.ZodType<TInputs>;
  defaults(ctx: FinancialContext): Promise<TInputs>;
  compute(inputs: TInputs, ctx: FinancialContext): Promise<PlanResult>;
  toGoal(inputs: TInputs): { targetAmount: number; suggestedName: string };
}

export const planRegistry: { [K in PlanKind]: PlanDefinition<any> } = {
  mortgage: mortgageDefinition,
};

// Discriminated validator used by goalSchema / import.
export const planSchema = z.discriminatedUnion('plan_kind', [
  z.object({ plan_kind: z.literal('mortgage'), plan_inputs: mortgagePlanSchema }),
]);
