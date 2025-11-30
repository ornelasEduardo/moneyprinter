const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/moneyprinter',
});

async function addTypeColumn() {
  try {
    console.log('Adding type column to income_sources...');
    
    // Add the type column if it doesn't exist
    await pool.query(`
      ALTER TABLE income_sources 
      ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'paycheck'
    `);
    
    // Update existing rows to have type='paycheck'
    await pool.query(`
      UPDATE income_sources 
      SET type = 'paycheck' 
      WHERE type IS NULL
    `);
    
    console.log('Successfully added type column!');
  } catch (err) {
    console.error('Error adding column:', err);
  } finally {
    await pool.end();
  }
}

addTypeColumn();
