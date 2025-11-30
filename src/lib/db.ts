import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/moneyprinter',
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export default pool;
