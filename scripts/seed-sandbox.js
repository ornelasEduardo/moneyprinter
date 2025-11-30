const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env' });

const prisma = new PrismaClient();

async function seedSandbox() {
  try {
    // Get sandbox user ID
    const user = await prisma.users.findUnique({
      where: { username: 'sandbox' }
    });

    if (!user) {
      console.error('Sandbox user not found');
      return;
    }
    const sandboxUserId = user.id;

    console.log('Seeding sandbox account with test data...');

    // Add test accounts
    const accountsData = [
      { name: 'Chase Checking', type: 'checking', balance: 5000.00, currency: 'USD' },
      { name: 'Ally Savings', type: 'savings', balance: 25000.00, currency: 'USD' },
      { name: 'Vanguard 401k', type: 'investment', balance: 150000.00, currency: 'USD' },
      { name: 'Robinhood', type: 'investment', balance: 12500.00, currency: 'USD' }
    ];

    for (const acc of accountsData) {
      const existing = await prisma.accounts.findFirst({
        where: { user_id: sandboxUserId, name: acc.name }
      });
      if (!existing) {
        await prisma.accounts.create({
          data: { ...acc, user_id: sandboxUserId }
        });
      }
    }

    // Add test income sources
    const incomeData = [
      { name: 'Tech Corp Salary', type: 'paycheck', amount: 8000.00, frequency: 'bi-weekly', next_date: new Date('2025-12-15') },
      { name: 'Annual Bonus', type: 'bonus', amount: 20000.00, frequency: 'yearly', next_date: new Date('2026-01-15') }
    ];

    for (const inc of incomeData) {
      const existing = await prisma.income_sources.findFirst({
        where: { user_id: sandboxUserId, name: inc.name }
      });
      if (!existing) {
        await prisma.income_sources.create({
          data: { ...inc, user_id: sandboxUserId }
        });
      }
    }

    // Add test transactions
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const transactions = [
        { name: 'Whole Foods', amount: 85.50, category: 'Groceries' },
        { name: 'Shell Gas Station', amount: 45.00, category: 'Transportation' },
        { name: 'Netflix', amount: 15.99, category: 'Entertainment' },
        { name: 'Starbucks', amount: 6.50, category: 'Dining' },
      ];
      
      const tx = transactions[i % transactions.length];
      
      const existing = await prisma.transactions.findFirst({
        where: { 
          user_id: sandboxUserId, 
          date: date, 
          name: tx.name, 
          amount: tx.amount 
        }
      });

      if (!existing) {
        await prisma.transactions.create({
          data: {
            user_id: sandboxUserId,
            amount: tx.amount,
            date: date,
            name: tx.name,
            tags: tx.category,
            type: 'expense'
          }
        });
      }
    }

    // Add net worth history
    const startValue = 150000;
    for (let i = 90; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const variation = Math.sin(i / 10) * 5000 + (90 - i) * 100;
      const netWorth = startValue + variation + (Math.random() - 0.5) * 2000;
      
      await prisma.net_worth_history.upsert({
        where: {
          user_id_date: {
            user_id: sandboxUserId,
            date: date
          }
        },
        update: {},
        create: {
          user_id: sandboxUserId,
          date: date,
          net_worth: netWorth
        }
      });
    }

    // Add a primary goal
    const goal = { name: 'House Down Payment', target_amount: 100000.00, current_amount: 45000.00, is_primary: true, target_date: new Date('2026-12-31') };
    const existingGoal = await prisma.goals.findFirst({
      where: { user_id: sandboxUserId, name: goal.name }
    });
    if (!existingGoal) {
      await prisma.goals.create({
        data: { ...goal, user_id: sandboxUserId }
      });
    }

    // Add emergency fund setting
    await prisma.user_settings.upsert({
      where: {
        user_id_key: {
          user_id: sandboxUserId,
          key: 'emergency_fund_amount'
        }
      },
      update: {},
      create: {
        user_id: sandboxUserId,
        key: 'emergency_fund_amount',
        value: '30000'
      }
    });

    console.log('Sandbox account seeded successfully!');
  } catch (err) {
    console.error('Error seeding sandbox:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seedSandbox();
