const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/moneyprinter',
});

async function migrate() {
  try {
    const migrationPath = path.join(__dirname, '../src/lib/schema-multiuser.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running multi-user migration...');
    await pool.query(migration);
    console.log('Multi-user migration applied successfully.');
  } catch (err) {
    console.error('Error applying migration:', err);
  } finally {
    await pool.end();
  }
}

migrate();
