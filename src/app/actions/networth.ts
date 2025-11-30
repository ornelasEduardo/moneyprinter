'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/action-middleware';

export async function createNetWorthEntry(formData: FormData) {
  const userId = await requireAuth();

  const date = formData.get('date') as string;
  const netWorth = parseFloat(formData.get('netWorth') as string);

  if (!date || isNaN(netWorth)) {
    throw new Error('Invalid form data');
  }

  try {
    await prisma.net_worth_history.create({
      data: {
        user_id: userId,
        date: new Date(date),
        net_worth: netWorth
      }
    });
  } catch (error) {
    console.error('Failed to create net worth entry:', error);
    throw new Error('Failed to create net worth entry');
  }

  revalidatePath('/');
  revalidatePath('/net-worth');
}

export async function updateNetWorthEntry(id: number, formData: FormData) {
  const userId = await requireAuth();

  const date = formData.get('date') as string;
  const netWorth = parseFloat(formData.get('netWorth') as string);

  if (!date || isNaN(netWorth)) {
    throw new Error('Invalid form data');
  }

  try {
    const check = await prisma.net_worth_history.findFirst({
      where: {
        id: id,
        user_id: userId
      }
    });

    if (!check) {
      throw new Error('Net worth entry not found or unauthorized');
    }

    await prisma.net_worth_history.update({
      where: {
        id: id
      },
      data: {
        date: new Date(date),
        net_worth: netWorth
      }
    });

    revalidatePath('/');
    revalidatePath('/net-worth');
  } catch (error) {
    console.error('Failed to update net worth entry:', error);
    throw new Error('Failed to update net worth entry');
  }
}

export async function deleteNetWorthEntry(id: number) {
  const userId = await requireAuth();

  try {
    const result = await prisma.net_worth_history.deleteMany({
      where: {
        id: id,
        user_id: userId
      }
    });

    if (result.count === 0) {
      throw new Error('Net worth entry not found or unauthorized');
    }

    revalidatePath('/');
    revalidatePath('/net-worth');
  } catch (error) {
    console.error('Failed to delete net worth entry:', error);
    throw new Error('Failed to delete net worth entry');
  }
}

export async function getNetWorthHistory() {
  const userId = await requireAuth();

  const entries = await prisma.net_worth_history.findMany({
    where: {
      user_id: userId
    },
    orderBy: {
      date: 'desc'
    },
    select: {
      id: true,
      date: true,
      net_worth: true
    }
  });

  return entries.map(row => ({
    id: row.id,
    date: row.date.toISOString().split('T')[0],
    netWorth: Number(row.net_worth)
  }));
}
