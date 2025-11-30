-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  is_sandbox BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add user_id to existing tables
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE income_sources ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE budget_limits ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE net_worth_history ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Drop old unique constraint on net_worth_history.date and add new one with user_id
ALTER TABLE net_worth_history DROP CONSTRAINT IF EXISTS net_worth_history_date_key;
ALTER TABLE net_worth_history ADD CONSTRAINT net_worth_history_user_date_unique UNIQUE (user_id, date);

-- Drop old unique constraint on user_settings.key and add new one with user_id
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_key_key;
ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_key_unique UNIQUE (user_id, key);

-- Insert default users
INSERT INTO users (username, display_name, is_sandbox) 
VALUES ('real', 'My Account', FALSE)
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, display_name, is_sandbox) 
VALUES ('sandbox', 'Sandbox Account', TRUE)
ON CONFLICT (username) DO NOTHING;
