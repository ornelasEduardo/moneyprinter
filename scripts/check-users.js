const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/moneyprinter',
});

async function checkUsers() {
  try {
    const result = await pool.query('SELECT id, username, display_name FROM users');
    console.log('Users in database:');
    console.table(result.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkUsers();
