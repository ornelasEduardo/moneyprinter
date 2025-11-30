const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/moneyprinter',
});

async function seedNetWorthHistory() {
  try {
    console.log('Seeding net worth history...');
    
    // Generate sample data for the last 90 days
    const today = new Date();
    const startValue = 50000;
    
    for (let i = 90; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Add some variation to make it interesting
      const variation = Math.sin(i / 10) * 5000 + (90 - i) * 100;
      const netWorth = startValue + variation + (Math.random() - 0.5) * 2000;
      
      const dateStr = date.toISOString().split('T')[0];
      
      await pool.query(
        'INSERT INTO net_worth_history (date, net_worth) VALUES ($1, $2) ON CONFLICT (date) DO NOTHING',
        [dateStr, netWorth.toFixed(2)]
      );
    }
    
    console.log('Successfully seeded net worth history!');
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    await pool.end();
  }
}

seedNetWorthHistory();
