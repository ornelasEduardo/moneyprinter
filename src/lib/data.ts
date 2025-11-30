import prisma from '@/lib/prisma';
import { getCurrentUser } from './auth';

export async function getNetWorth() {
  const userId = await getCurrentUser();
  if (!userId) return 0;

  const result = await prisma.accounts.aggregate({
    where: { user_id: userId },
    _sum: { balance: true }
  });
  return Number(result._sum.balance) || 0;
}

export async function getAccounts() {
  const userId = await getCurrentUser();
  if (!userId) return [];

  const accounts = await prisma.accounts.findMany({
    where: { user_id: userId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      type: true,
      balance: true,
      last_updated: true,
      currency: true
    }
  });

  return accounts.map(row => ({
    ...row,
    balance: Number(row.balance),
    last_updated: row.last_updated ? row.last_updated.toISOString() : null
  }));
}

export async function getMonthlySpending() {
  const userId = await getCurrentUser();
  if (!userId) return 0;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const result = await prisma.transactions.aggregate({
    where: {
      user_id: userId,
      date: { gte: startOfMonth },
      amount: { gt: 0 }
    },
    _sum: { amount: true }
  });
  return Number(result._sum.amount) || 0;
}

export async function getNetWorthHistory(days: number = 30) {
  const userId = await getCurrentUser();
  if (!userId) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const history = await prisma.net_worth_history.findMany({
    where: {
      user_id: userId,
      date: { gte: startDate }
    },
    orderBy: { date: 'asc' },
    select: {
      id: true,
      date: true,
      net_worth: true
    }
  });

  return history.map(row => ({
    id: row.id,
    date: row.date.toISOString().split('T')[0],
    netWorth: Number(row.net_worth)
  }));
}

export async function getNetWorthHistoryForYear(year: number) {
  const userId = await getCurrentUser();
  if (!userId) return [];

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);

  const history = await prisma.net_worth_history.findMany({
    where: {
      user_id: userId,
      date: {
        gte: startDate,
        lt: endDate
      }
    },
    orderBy: { date: 'asc' },
    select: {
      id: true,
      date: true,
      net_worth: true
    }
  });

  return history.map(row => ({
    id: row.id,
    date: row.date.toISOString().split('T')[0],
    netWorth: Number(row.net_worth)
  }));
}

export async function getWindfalls() {
  const userId = await getCurrentUser();
  if (!userId) return [];

  const windfalls = await prisma.income_sources.findMany({
    where: {
      user_id: userId,
      type: { in: ['bonus', 'rsu', 'espp', 'other'] },
      next_date: { not: null }
    },
    orderBy: { next_date: 'asc' },
    select: {
      name: true,
      amount: true,
      next_date: true,
      type: true
    }
  });

  return windfalls.map(row => ({
    name: row.name,
    amount: Number(row.amount),
    date: row.next_date!.toISOString().split('T')[0],
    type: row.type || 'other'
  }));
}

export async function getUpcomingWindfalls() {
  const userId = await getCurrentUser();
  if (!userId) return [];

  const windfalls = await prisma.income_sources.findMany({
    where: {
      user_id: userId,
      type: { in: ['bonus', 'rsu', 'espp', 'other'] },
      next_date: { gte: new Date() }
    },
    orderBy: { next_date: 'asc' },
    take: 5,
    select: {
      name: true,
      amount: true,
      next_date: true,
      type: true
    }
  });

  return windfalls.map(row => ({
    name: row.name,
    amount: Number(row.amount),
    date: row.next_date!.toISOString().split('T')[0],
    type: row.type || 'other'
  }));
}

export async function getTransactionsForYear(year: number) {
  const userId = await getCurrentUser();
  if (!userId) return [];

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);

  const transactions = await prisma.transactions.findMany({
    where: {
      user_id: userId,
      date: {
        gte: startDate,
        lt: endDate
      },
      amount: { gt: 0 }
    },
    orderBy: { date: 'asc' },
    include: {
      accounts: {
        select: { name: true }
      }
    }
  });

  return transactions.map(row => ({
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    date: row.date.toISOString().split('T')[0],
    tags: row.tags,
    accountId: row.account_id,
    accountName: row.accounts?.name,
    type: row.type || 'expense'
  }));
}

export async function calculateMonthlyNetWorthIncrease() {
  try {
    const userId = await getCurrentUser();
    if (!userId) return 0;

    const income = await prisma.income_sources.findFirst({
      where: {
        user_id: userId,
        type: 'paycheck'
      },
      select: {
        id: true,
        amount: true,
        frequency: true
      }
    });

    if (!income) {
      return 0;
    }

    const paycheckAmount = Number(income.amount);
    const frequency = income.frequency;

    const budgets = await prisma.income_budgets.findMany({
      where: {
        income_source_id: income.id,
        increases_net_worth: true
      },
      select: {
        unit: true,
        value: true
      }
    });

    let netWorthIncreasePerPaycheck = 0;
    for (const budget of budgets) {
      if (budget.unit === 'percentage') {
        netWorthIncreasePerPaycheck += (paycheckAmount * Number(budget.value)) / 100;
      } else {
        netWorthIncreasePerPaycheck += Number(budget.value);
      }
    }

    let paychecksPerMonth = 2;
    switch (frequency) {
      case 'weekly':
        paychecksPerMonth = 4.33;
        break;
      case 'bi-weekly':
        paychecksPerMonth = 2.17;
        break;
      case 'semi-monthly':
        paychecksPerMonth = 2;
        break;
      case 'monthly':
        paychecksPerMonth = 1;
        break;
    }

    return netWorthIncreasePerPaycheck * paychecksPerMonth;
  } catch (error) {
    console.error('Error calculating monthly net worth increase:', error);
    return 0;
  }
}

export async function getProjectedNetWorthHistory(days: number = 30) {
  const currentNetWorth = await getNetWorth();
  const monthlyIncrease = await calculateMonthlyNetWorthIncrease();
  const historical = await getNetWorthHistory(days);

  if (historical.length >= days / 2) {
    return historical;
  }

  const projectedData = [];
  const today = new Date();
  const dailyIncrease = monthlyIncrease / 30;

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    projectedData.push({
      date: date.toISOString().split('T')[0],
      netWorth: currentNetWorth + (i * dailyIncrease)
    });
  }
  
  return projectedData;
}

export async function getAvailableYears() {
  const userId = await getCurrentUser();
  if (!userId) return [new Date().getFullYear()];

  const result = await prisma.$queryRaw`
    SELECT DISTINCT EXTRACT(YEAR FROM date) as year 
    FROM net_worth_history 
    WHERE user_id = ${userId} 
    ORDER BY year DESC
  `;
  
  const years = (result as any[]).map(row => Number(row.year));
  
  const currentYear = new Date().getFullYear();
  if (!years.includes(currentYear)) {
    years.unshift(currentYear);
  }
  
  return years.sort((a, b) => b - a);
}
