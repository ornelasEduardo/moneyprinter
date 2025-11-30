'use server'

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/action-middleware';

// Internal helper to get or create default paycheck income source for a user
async function _getOrCreateDefaultIncomeSource(userId: number): Promise<number> {
  const existing = await prisma.income_sources.findFirst({
    where: {
      user_id: userId,
      type: 'paycheck'
    },
    select: { id: true }
  });

  if (existing) {
    return existing.id;
  }

  const newSource = await prisma.income_sources.create({
    data: {
      user_id: userId,
      name: 'Primary Paycheck',
      type: 'paycheck',
      amount: 0,
      frequency: 'bi-weekly',
      next_date: new Date()
    },
    select: { id: true }
  });

  return newSource.id;
}

export async function saveIncomeBudgets(
  incomeSourceId: number,
  paycheckAmount: number,
  budgets: Array<{
    name: string;
    unit: 'percentage' | 'fixed';
    value: number;
    type: 'savings' | 'investment' | 'expense';
    increasesNetWorth: boolean;
  }>
) {
  const userId = await requireAuth();

  try {
    await prisma.$transaction(async (tx) => {
      // Delete existing budgets for this income source and user
      await tx.income_budgets.deleteMany({
        where: {
          income_source_id: incomeSourceId,
          user_id: userId
        }
      });

      // Update the income source amount
      await tx.income_sources.updateMany({
        where: {
          id: incomeSourceId,
          user_id: userId
        },
        data: {
          amount: paycheckAmount
        }
      });

      // Insert new budgets
      if (budgets.length > 0) {
        await tx.income_budgets.createMany({
          data: budgets.map(b => ({
            income_source_id: incomeSourceId,
            user_id: userId,
            name: b.name,
            unit: b.unit,
            value: b.value,
            type: b.type,
            increases_net_worth: b.increasesNetWorth
          }))
        });
      }
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to save allocations:', error);
    throw new Error('Failed to save allocations');
  }
}

export async function saveDefaultIncomeBudgets(
  paycheckAmount: number,
  budgets: Array<{
    name: string;
    unit: 'percentage' | 'fixed';
    value: number;
    type: 'savings' | 'investment' | 'expense';
    increasesNetWorth: boolean;
  }>
) {
  const userId = await requireAuth();
  const incomeSourceId = await _getOrCreateDefaultIncomeSource(userId);
  return saveIncomeBudgets(incomeSourceId, paycheckAmount, budgets);
}

export async function getIncomeBudgets(incomeSourceId: number) {
  const userId = await requireAuth();
  try {
    const budgets = await prisma.income_budgets.findMany({
      where: {
        income_source_id: incomeSourceId,
        user_id: userId
      },
      orderBy: {
        id: 'asc'
      }
    });

    return budgets.map(row => ({
      id: row.id.toString(),
      name: row.name,
      unit: row.unit as 'percentage' | 'fixed',
      value: Number(row.value),
      type: row.type as 'savings' | 'investment' | 'expense',
      increasesNetWorth: row.increases_net_worth ?? true
    }));
  } catch (error) {
    console.error('Failed to get allocations:', error);
    return [];
  }
}

export async function getDefaultIncomeBudgets() {
  const userId = await requireAuth();
  const incomeSourceId = await _getOrCreateDefaultIncomeSource(userId);
  
  const incomeSource = await prisma.income_sources.findFirst({
    where: {
      id: incomeSourceId,
      user_id: userId
    },
    select: { amount: true }
  });

  const budgets = await getIncomeBudgets(incomeSourceId);
  return {
    paycheckAmount: Number(incomeSource?.amount || 0),
    budgets
  };
}

export async function getIncomeSources() {
  const userId = await requireAuth();
  
  // Use raw query for complex ordering by aggregated relation
  const result = await prisma.$queryRaw`
    SELECT s.id, s.name, s.type, s.amount 
    FROM income_sources s
    LEFT JOIN income_budgets b ON s.id = b.income_source_id
    WHERE s.user_id = ${userId}
    GROUP BY s.id
    ORDER BY MAX(b.updated_at) DESC NULLS LAST, s.name ASC
  `;
  
  return (result as any[]).map(row => ({
    id: row.id,
    name: row.name,
    type: row.type,
    amount: Number(row.amount)
  }));
}

export async function getBudgetsForIncomeSource(incomeSourceId: number) {
  const userId = await requireAuth();
  
  const incomeSource = await prisma.income_sources.findFirst({
    where: {
      id: incomeSourceId,
      user_id: userId
    },
    select: { amount: true }
  });
  
  if (!incomeSource) {
    throw new Error('Income source not found');
  }

  const budgets = await getIncomeBudgets(incomeSourceId);
  
  return {
    paycheckAmount: Number(incomeSource.amount),
    budgets
  };
}
