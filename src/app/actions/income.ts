'use server'

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/action-middleware';

export async function createIncomeSource(formData: FormData) {
  const userId = await requireAuth();

  const name = formData.get('name') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const frequency = formData.get('frequency') as string;
  const nextDate = formData.get('next_date') as string;
  const type = (formData.get('type') as string) || 'paycheck';

  if (!name || !amount || isNaN(amount) || !frequency) {
    throw new Error('Invalid form data');
  }

  try {
    await prisma.income_sources.create({
      data: {
        user_id: userId,
        name,
        amount,
        frequency,
        next_date: nextDate ? new Date(nextDate) : null,
        type
      }
    });
  } catch (error) {
    console.error('Failed to create income source:', error);
    throw new Error('Failed to create income source');
  }

  const year = formData.get('year') as string;

  revalidatePath('/');
  
  if (year) {
    redirect(`/?tab=budget&year=${year}`);
  } else {
    redirect('/?tab=budget');
  }
}
