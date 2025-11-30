CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  is_sandbox BOOLEAN DEFAULT FALSE,
  session_token VARCHAR(255),
  session_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_passwords (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  plaid_id VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  plaid_transaction_id VARCHAR(255) UNIQUE,
  account_id INTEGER REFERENCES accounts(id),
  amount DECIMAL(12, 2) NOT NULL,
  date DATE NOT NULL,
  name VARCHAR(255) NOT NULL,
  tags VARCHAR(255),
  type VARCHAR(50) DEFAULT 'expense', -- 'income', 'expense'
  pending BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS income_sources (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'paycheck', -- 'paycheck', 'bonus', 'rsu', 'espp', 'other'
  amount DECIMAL(12, 2) NOT NULL,
  frequency VARCHAR(50) NOT NULL, -- 'monthly', 'bi-weekly', etc.
  next_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budget_limits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  category VARCHAR(255) NOT NULL,
  limit_amount DECIMAL(12, 2) NOT NULL,
  UNIQUE(user_id, category)
);

CREATE TABLE IF NOT EXISTS net_worth_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  date DATE NOT NULL,
  net_worth DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS income_budgets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  income_source_id INTEGER REFERENCES income_sources(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL, -- 'percentage', 'fixed'
  value DECIMAL(12, 2) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'savings', 'investment', 'expense'
  increases_net_worth BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL,
  current_amount DECIMAL(12, 2) DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  target_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  key VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, key)
);
