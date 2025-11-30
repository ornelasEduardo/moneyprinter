const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/moneyprinter',
});

async function fixExistingData() {
  try {
    console.log('Fixing existing data to assign user_id...\n');

    // Get the first user (real account)
    const userResult = await pool.query("SELECT id FROM users WHERE username = 'real' LIMIT 1");
    
    if (userResult.rows.length === 0) {
      console.log('No users found. Please run the auth migration first.');
      return;
    }

    const userId = userResult.rows[0].id;
    console.log(`Assigning all data to user ID: ${userId}\n`);

    // Update accounts without user_id
    const accountsResult = await pool.query(
      'UPDATE accounts SET user_id = $1 WHERE user_id IS NULL',
      [userId]
    );
    console.log(`✓ Updated ${accountsResult.rowCount} accounts`);

    // Update transactions without user_id
    const transactionsResult = await pool.query(
      'UPDATE transactions SET user_id = $1 WHERE user_id IS NULL',
      [userId]
    );
    console.log(`✓ Updated ${transactionsResult.rowCount} transactions`);

    // Update income_sources without user_id
    const incomeResult = await pool.query(
      'UPDATE income_sources SET user_id = $1 WHERE user_id IS NULL',
      [userId]
    );
    console.log(`✓ Updated ${incomeResult.rowCount} income sources`);

    // Update budget_limits without user_id
    const budgetResult = await pool.query(
      'UPDATE budget_limits SET user_id = $1 WHERE user_id IS NULL',
      [userId]
    );
    console.log(`✓ Updated ${budgetResult.rowCount} budget limits`);

    // Update net_worth_history without user_id
    const networthResult = await pool.query(
      'UPDATE net_worth_history SET user_id = $1 WHERE user_id IS NULL',
      [userId]
    );
    console.log(`✓ Updated ${networthResult.rowCount} net worth history records`);

    // Update goals without user_id
    const goalsResult = await pool.query(
      'UPDATE goals SET user_id = $1 WHERE user_id IS NULL',
      [userId]
    );
    console.log(`✓ Updated ${goalsResult.rowCount} goals`);

    // Update user_settings without user_id
    const settingsResult = await pool.query(
      'UPDATE user_settings SET user_id = $1 WHERE user_id IS NULL',
      [userId]
    );
    console.log(`✓ Updated ${settingsResult.rowCount} user settings`);

    console.log('\n✅ All existing data has been assigned to the real account!');

  } catch (err) {
    console.error('Error fixing data:', err);
  } finally {
    await pool.end();
  }
}

fixExistingData();
