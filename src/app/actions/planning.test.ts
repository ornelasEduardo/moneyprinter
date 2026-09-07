import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/action-middleware', () => ({ requireAuth: vi.fn(async () => 2) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  default: { goals: { create: vi.fn(async () => ({ id: 7 })), findFirst: vi.fn(), findMany: vi.fn() },
             accounts: { aggregate: vi.fn(async () => ({ _sum: { balance: 50000 } })) },
             transactions: { findMany: vi.fn(async () => []) } },
}));

import prisma from '@/lib/prisma';
import { saveGoalFromPlan, getGoalPlan, getPlanGoals } from './planning';

const validInputs = {
  homePrice: 400000, downPayment: 80000, annualRatePct: 6, termYears: 30,
  propertyTaxAnnual: 4800, homeInsuranceAnnual: 1200, hoaMonthly: 0, pmiMonthly: 0, existingMonthlyDebt: 0,
};

beforeEach(() => vi.clearAllMocks());

describe('saveGoalFromPlan', () => {
  it('validates inputs and writes a goal with target = down payment + attached plan', async () => {
    const res = await saveGoalFromPlan('mortgage', validInputs, { targetDate: null });
    expect(res.id).toBe(7);
    const arg = (prisma.goals.create as any).mock.calls[0][0].data;
    expect(arg.target_amount).toBe(80000);
    expect(arg.name).toBe('House down payment');
    expect(arg.plan_kind).toBe('mortgage');
    expect(arg.plan_inputs).toEqual(validInputs);
    expect(arg.user_id).toBe(2);
  });

  it('rejects invalid inputs (does not write)', async () => {
    await expect(saveGoalFromPlan('mortgage', { ...validInputs, downPayment: 999999 })).rejects.toThrow();
    expect(prisma.goals.create).not.toHaveBeenCalled();
  });
});

describe('getGoalPlan', () => {
  it('returns kind + inputs for a goal that carries a plan', async () => {
    (prisma.goals.findFirst as any).mockResolvedValue({ id: 7, plan_kind: 'mortgage', plan_inputs: validInputs });
    expect(await getGoalPlan(7)).toEqual({ kind: 'mortgage', inputs: validInputs });
  });
  it('returns null for a plain goal', async () => {
    (prisma.goals.findFirst as any).mockResolvedValue({ id: 8, plan_kind: null, plan_inputs: null });
    expect(await getGoalPlan(8)).toBeNull();
  });
});

describe('getPlanGoals', () => {
  it('getPlanGoals returns only plan-carrying goals, mapped', async () => {
    (prisma.goals.findMany as any).mockResolvedValue([
      { id: 7, name: 'House down payment', target_amount: 80000, plan_kind: 'mortgage' },
    ]);
    const goals = await getPlanGoals();
    expect(goals).toEqual([{ id: 7, name: 'House down payment', targetAmount: 80000, kind: 'mortgage' }]);
    const where = (prisma.goals.findMany as any).mock.calls[0][0].where;
    expect(where).toEqual({ user_id: expect.any(Number), plan_kind: { not: null } });
  });
});
