'use server'

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/action-middleware';

export async function createAccount(formData: FormData) {
  const userId = await requireAuth();

  const name = formData.get('name') as string;
  const type = formData.get('type') as string;
  const balance = parseFloat(formData.get('balance') as string);
  const currency = formData.get('currency') as string || 'USD';

  if (!name || !type || isNaN(balance)) {
    throw new Error('Invalid form data');
  }

  try {
    await prisma.accounts.create({
      data: {
        user_id: userId,
        name,
        type,
        balance,
        currency
      }
    });
  } catch (error) {
    console.error('Failed to create account:', error);
    throw new Error('Failed to create account');
  }

  revalidatePath('/');
  redirect('/?tab=accounts');
}

export async function deleteAccount(id: number) {
  const userId = await requireAuth();

  try {
    await prisma.accounts.deleteMany({
      where: {
        id: id,
        user_id: userId
      }
    });
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to delete account:', error);
    throw new Error('Failed to delete account');
  }
}

export async function updateAccountBalance(accountId: number, newBalance: number) {
  const userId = await requireAuth();

  try {
    const result = await prisma.accounts.updateMany({
      where: {
        id: accountId,
        user_id: userId
      },
      data: {
        balance: newBalance,
        last_updated: new Date()
      }
    });

    if (result.count === 0) {
      throw new Error('Account not found or unauthorized');
    }
  } catch (error) {
    console.error('Failed to update account balance:', error);
    throw new Error('Failed to update account balance');
  }

  revalidatePath('/');
}

export async function updateAccount(id: number, formData: FormData) {
  const userId = await requireAuth();

  const name = formData.get('name') as string;
  const type = formData.get('type') as string;
  const balance = parseFloat(formData.get('balance') as string);
  const currency = (formData.get('currency') as string) || 'USD';

  if (!name || !type || isNaN(balance)) {
    throw new Error('Invalid form data');
  }

  try {
    const result = await prisma.accounts.updateMany({
      where: {
        id: id,
        user_id: userId
      },
      data: {
        name,
        type,
        balance,
        currency,
        last_updated: new Date()
      }
    });

    if (result.count === 0) {
      throw new Error('Account not found or unauthorized');
    }

    revalidatePath('/');
  } catch (error) {
    console.error('Failed to update account:', error);
    throw new Error('Failed to update account');
  }
}
