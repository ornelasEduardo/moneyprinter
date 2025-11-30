const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/moneyprinter',
});

async function migrateAuth() {
  try {
    console.log('Running authentication migration...');
    
    // Apply schema changes
    const schemaPath = path.join(__dirname, '../src/lib/schema-auth.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    
    console.log('Schema updated successfully.');
    
    // Hash default passwords
    const realPasswordHash = await bcrypt.hash('real123', 10);
    const sandboxPasswordHash = await bcrypt.hash('moneyprinter_sandbox', 10);
    
    // Update users with password hashes
    await pool.query(
      `UPDATE users SET password_hash = $1 WHERE username = 'real'`,
      [realPasswordHash]
    );
    
    await pool.query(
      `UPDATE users SET password_hash = $1 WHERE username = 'sandbox'`,
      [sandboxPasswordHash]
    );
    
    console.log('Default passwords set successfully.');
    console.log('');
    console.log('Default credentials:');
    console.log('  Real Account:    username: real     password: real123');
    console.log('  Sandbox Account: username: sandbox  password: moneyprinter_sandbox');
    console.log('');
    console.log('⚠️  IMPORTANT: Change these passwords in production!');
    
  } catch (err) {
    console.error('Error applying auth migration:', err);
  } finally {
    await pool.end();
  }
}

migrateAuth();
