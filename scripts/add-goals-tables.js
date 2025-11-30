const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting migration...');
    await client.query('BEGIN');

    // Create user_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    console.log('Created user_settings table');

    // Create goals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        target_amount DECIMAL(12, 2) NOT NULL,
        current_amount DECIMAL(12, 2) DEFAULT 0, -- Optional, if we want to track specific contributions, but user implied using net worth
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created goals table');

    // Seed default settings if not exists
    const settingsCheck = await client.query("SELECT * FROM user_settings WHERE key = 'emergency_fund_amount'");
    if (settingsCheck.rowCount === 0) {
      await client.query("INSERT INTO user_settings (key, value) VALUES ('emergency_fund_amount', '10000')");
      console.log('Seeded default emergency_fund_amount');
    }

    // Seed a default goal if not exists
    const goalsCheck = await client.query("SELECT * FROM goals");
    if (goalsCheck.rowCount === 0) {
      await client.query("INSERT INTO goals (name, target_amount, is_primary) VALUES ('Financial Freedom', 1000000, TRUE)");
      console.log('Seeded default goal');
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
