-- App Settings table: KV store replacing all localStorage
-- Each row is a (user_id, category, key) → value mapping

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category, key)
);

-- Index for fast lookups by user + category
CREATE INDEX IF NOT EXISTS idx_app_settings_user_category ON app_settings(user_id, category);

-- Index for fast lookups by user + category + key
CREATE INDEX IF NOT EXISTS idx_app_settings_user_cat_key ON app_settings(user_id, category, key);

-- RLS policies
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own settings" ON app_settings
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own settings" ON app_settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own settings" ON app_settings
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete own settings" ON app_settings
  FOR DELETE USING (true);
