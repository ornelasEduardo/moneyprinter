'use server';

import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/action-middleware';
import { revalidatePath } from 'next/cache';

export async function getPrimaryGoal() {
  const userId = await requireAuth();
  const goal = await prisma.goals.findFirst({
    where: {
      user_id: userId,
      is_primary: true
    }
  });
  
  if (goal) {
    return {
      ...goal,
      target_amount: Number(goal.target_amount),
      current_amount: Number(goal.current_amount)
    };
  }
  return null;
}

export async function getEmergencyFundAmount() {
  const userId = await requireAuth();
  const setting = await prisma.user_settings.findUnique({
    where: {
      user_id_key: {
        user_id: userId,
        key: 'emergency_fund_amount'
      }
    },
    select: { value: true }
  });
  return setting ? parseFloat(setting.value) : 0;
}

export async function updatePrimaryGoal(name: string, targetAmount: number) {
  const userId = await requireAuth();
  
  const existing = await prisma.goals.findFirst({
    where: {
      user_id: userId,
      is_primary: true
    }
  });

  if (existing) {
    await prisma.goals.update({
      where: { id: existing.id },
      data: {
        name,
        target_amount: targetAmount
      }
    });
  } else {
    await prisma.goals.create({
      data: {
        user_id: userId,
        name,
        target_amount: targetAmount,
        is_primary: true,
        current_amount: 0
      }
    });
  }
  revalidatePath('/');
}

export async function updateEmergencyFundAmount(amount: number) {
  const userId = await requireAuth();
  
  await prisma.user_settings.upsert({
    where: {
      user_id_key: {
        user_id: userId,
        key: 'emergency_fund_amount'
      }
    },
    update: {
      value: amount.toString()
    },
    create: {
      user_id: userId,
      key: 'emergency_fund_amount',
      value: amount.toString()
    }
  });
  
  revalidatePath('/');
}
