'use server';

import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/action-middleware';
import { revalidatePath } from 'next/cache';
import { planRegistry, type PlanKind } from '@/lib/planning/registry';
import { createServerContext, snapshotOf } from '@/lib/planning/server-context';

export async function resolvePlanContext(kind: PlanKind) {
  const userId = await requireAuth();
  const def = planRegistry[kind];
  const ctx = createServerContext(userId);
  const defaults = await def.defaults(ctx);
  // Prime the assessment signals so the snapshot covers a first compute.
  await def.compute(defaults, ctx);
  return { defaults, snapshot: snapshotOf(ctx) };
}

export async function saveGoalFromPlan(
  kind: PlanKind,
  inputs: unknown,
  opts?: { name?: string; targetDate?: string | null },
) {
  const userId = await requireAuth();
  const def = planRegistry[kind];
  const parsed = def.schema.parse(inputs); // throws on invalid
  const { targetAmount, suggestedName } = def.toGoal(parsed);

  const goal = await prisma.goals.create({
    data: {
      user_id: userId,
      name: opts?.name?.trim() || suggestedName,
      target_amount: targetAmount,
      current_amount: 0,
      is_primary: false,
      target_date: opts?.targetDate ? new Date(opts.targetDate) : null,
      plan_kind: kind,
      plan_inputs: parsed as object,
    },
    select: { id: true },
  });
  revalidatePath('/');
  return { id: goal.id };
}

export interface PlanGoal {
  id: number;
  name: string;
  targetAmount: number;
  kind: PlanKind;
  createdAt: number;
}

export async function getPlanGoals(): Promise<PlanGoal[]> {
  const userId = await requireAuth();
  const goals = await prisma.goals.findMany({
    where: { user_id: userId, plan_kind: { not: null } },
    select: { id: true, name: true, target_amount: true, plan_kind: true, created_at: true },
    orderBy: { created_at: 'desc' },
  });
  return goals.map((g) => ({
    id: g.id,
    name: g.name,
    targetAmount: Number(g.target_amount),
    kind: g.plan_kind as PlanKind,
    // created_at is nullable in Prisma's type despite the column's DB default.
    createdAt: g.created_at ? g.created_at.getTime() : 0,
  }));
}

export async function getGoalPlan(goalId: number) {
  const userId = await requireAuth();
  const goal = await prisma.goals.findFirst({
    where: { id: goalId, user_id: userId },
    select: { plan_kind: true, plan_inputs: true },
  });
  if (!goal || !goal.plan_kind) return null;
  return { kind: goal.plan_kind as PlanKind, inputs: goal.plan_inputs };
}
