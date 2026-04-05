-- ============================================================================
-- Admin Settings, App States, and Cache Tables
-- ============================================================================
-- Migration for scalable state management, caching, and admin dashboard
-- ============================================================================

-- ============================================================================
-- APP SETTINGS TABLE
-- ============================================================================
-- Stores application-wide and user-specific settings

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT, -- NULL for global settings
  category TEXT NOT NULL, -- 'ai', 'ui', 'chat', 'editor', 'admin'
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  is_sensitive BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint for user + category + key
  CONSTRAINT unique_setting UNIQUE (user_id, category, key)
);

-- ============================================================================
-- APP STATE TABLE
-- ============================================================================
-- Stores application state snapshots for debugging and admin viewing

CREATE TABLE IF NOT EXISTS app_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT,
  session_id TEXT,
  state_type TEXT NOT NULL, -- 'ui', 'chat', 'editor', 'streaming', 'error'
  state_data JSONB NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT state_type_valid CHECK (state_type IN ('ui', 'chat', 'editor', 'streaming', 'error', 'debug', 'analytics'))
);

-- ============================================================================
-- CACHE TABLE
-- ============================================================================
-- Database-backed cache for persistent caching across server restarts

CREATE TABLE IF NOT EXISTS cache_entries (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  hit_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ADMIN AUDIT LOG TABLE
-- ============================================================================
-- Tracks admin actions for security and debugging

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL, -- 'conversation', 'user', 'setting', 'cache'
  resource_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ANALYTICS TABLE
-- ============================================================================
-- Stores analytics events for admin dashboard

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL, -- 'chat_started', 'diagram_created', 'error', etc.
  user_id TEXT,
  session_id TEXT,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- App settings indexes
CREATE INDEX IF NOT EXISTS idx_app_settings_user ON app_settings(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON app_settings(category);
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(category, key);

-- App states indexes
CREATE INDEX IF NOT EXISTS idx_app_states_user ON app_states(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_states_session ON app_states(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_states_type ON app_states(state_type);
CREATE INDEX IF NOT EXISTS idx_app_states_created ON app_states(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_states_expires ON app_states(expires_at) WHERE expires_at IS NOT NULL;

-- Cache indexes
CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_entries(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cache_tags ON cache_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_cache_accessed ON cache_entries(last_accessed_at DESC);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON admin_audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log(created_at DESC);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_conversation ON analytics_events(conversation_id) WHERE conversation_id IS NOT NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at for app_settings
CREATE TRIGGER update_app_settings_updated_at 
  BEFORE UPDATE ON app_settings
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Update cache hit count and last_accessed
CREATE OR REPLACE FUNCTION update_cache_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.hit_count := OLD.hit_count + 1;
  NEW.last_accessed_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Get or create setting
CREATE OR REPLACE FUNCTION get_or_create_setting(
  p_user_id TEXT,
  p_category TEXT,
  p_key TEXT,
  p_default_value JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  setting_value JSONB;
BEGIN
  SELECT value INTO setting_value
  FROM app_settings
  WHERE (user_id = p_user_id OR (user_id IS NULL AND p_user_id IS NULL))
    AND category = p_category
    AND key = p_key;
    
  IF setting_value IS NULL THEN
    INSERT INTO app_settings (user_id, category, key, value)
    VALUES (p_user_id, p_category, p_key, p_default_value)
    ON CONFLICT (user_id, category, key) DO NOTHING
    RETURNING value INTO setting_value;
    
    IF setting_value IS NULL THEN
      setting_value := p_default_value;
    END IF;
  END IF;
  
  RETURN setting_value;
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM cache_entries
    WHERE expires_at IS NOT NULL AND expires_at < NOW()
    RETURNING key
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired app states
CREATE OR REPLACE FUNCTION cleanup_expired_states()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM app_states
    WHERE expires_at IS NOT NULL AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Get admin dashboard stats
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE(
  total_conversations BIGINT,
  total_messages BIGINT,
  total_users BIGINT,
  active_sessions BIGINT,
  cache_entries_count BIGINT,
  cache_hit_rate NUMERIC,
  total_tokens_used BIGINT,
  estimated_cost_usd NUMERIC,
  conversations_today BIGINT,
  messages_today BIGINT,
  errors_today BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM conversations)::BIGINT as total_conversations,
    (SELECT COUNT(*) FROM messages)::BIGINT as total_messages,
    (SELECT COUNT(DISTINCT user_id) FROM conversations WHERE user_id IS NOT NULL)::BIGINT as total_users,
    (SELECT COUNT(DISTINCT session_id) FROM app_states WHERE session_id IS NOT NULL AND created_at > NOW() - INTERVAL '1 hour')::BIGINT as active_sessions,
    (SELECT COUNT(*) FROM cache_entries)::BIGINT as cache_entries_count,
    COALESCE((SELECT SUM(hit_count)::NUMERIC / NULLIF(COUNT(*), 0) FROM cache_entries), 0) as cache_hit_rate,
    COALESCE((SELECT SUM(us.total_tokens) FROM usage_stats us), 0)::BIGINT as total_tokens_used,
    COALESCE((SELECT SUM(us.estimated_cost_usd) FROM usage_stats us), 0)::NUMERIC as estimated_cost_usd,
    (SELECT COUNT(*) FROM conversations WHERE created_at > NOW() - INTERVAL '1 day')::BIGINT as conversations_today,
    (SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '1 day')::BIGINT as messages_today,
    (SELECT COUNT(*) FROM ap\p_states WHERE state_type = 'error' AND created_at > NOW() - INTERVAL '1 day')::BIGINT as errors_today;
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Get recent activity for admin
CREATE OR REPLACE FUNCTION get_recent_activity(p_limit INTEGER DEFAULT 50)
RETURNS TABLE(
  activity_type TEXT,
  activity_id TEXT,
  description TEXT,
  user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  (
    SELECT 
      'conversation'::TEXT as activity_type,
      c.id::TEXT as activity_id,
      COALESCE(c.title, 'Untitled Conversation') as description,
      c.user_id::TEXT,
      c.created_at
    FROM conversations c
    ORDER BY c.created_at DESC
    LIMIT p_limit / 3
  )
  UNION ALL
  (
    SELECT 
      'analytics'::TEXT as activity_type,
      ae.id::TEXT as activity_id,
      ae.event_type as description,
      ae.user_id::TEXT,
      ae.created_at
    FROM analytics_events ae
    ORDER BY ae.created_at DESC
    LIMIT p_limit / 3
  )
  UNION ALL
  (
    SELECT 
      'state'::TEXT as activity_type,
      aps.id::TEXT as activity_id,
      aps.state_type as description,
      aps.user_id::TEXT,
      aps.created_at
    FROM app_states aps
    WHERE aps.state_type = 'error'
    ORDER BY aps.created_at DESC
    LIMIT p_limit / 3
  )
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow all for now (restrict when auth is added)
CREATE POLICY "Allow all on app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on app_states" ON app_states FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on cache_entries" ON cache_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on admin_audit_log" ON admin_audit_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on analytics_events" ON analytics_events FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- DEFAULT SETTINGS
-- ============================================================================

-- Insert default global settings
INSERT INTO app_settings (user_id, category, key, value, description) VALUES
  (NULL, 'ai', 'default_model', '"gpt-4o"', 'Default AI model'),
  (NULL, 'ai', 'max_tokens', '4000', 'Maximum tokens per request'),
  (NULL, 'ai', 'temperature', '0.7', 'Default temperature'),
  (NULL, 'chat', 'max_conversations_per_user', '10', 'Max conversations per user'),
  (NULL, 'chat', 'max_messages_per_conversation', '100', 'Max messages per conversation'),
  (NULL, 'chat', 'auto_cleanup_days', '30', 'Days before auto cleanup'),
  (NULL, 'cache', 'default_ttl_seconds', '3600', 'Default cache TTL'),
  (NULL, 'cache', 'max_entries', '10000', 'Maximum cache entries'),
  (NULL, 'ui', 'default_theme', '"dark"', 'Default UI theme'),
  (NULL, 'ui', 'show_reasoning', 'true', 'Show AI reasoning by default'),
  (NULL, 'admin', 'require_auth', 'false', 'Require authentication for admin'),
  (NULL, 'admin', 'allowed_emails', '[]', 'List of allowed admin emails')
ON CONFLICT (user_id, category, key) DO NOTHING;

-- ============================================================================
-- MAINTENANCE
-- ============================================================================

-- Schedule these functions via cron:
-- SELECT cleanup_expired_cache();  -- Run hourly
-- SELECT cleanup_expired_states(); -- Run hourly
