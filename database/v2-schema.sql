-- ============================================================================
-- Graphini v2 - Scalable Database Schema
-- ============================================================================
-- Designed for PostgreSQL. Supports multi-user, collaboration, credits,
-- chat persistence, and caching at scale.
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- DROP OLD TABLES (clean slate)
-- ============================================================================
DROP TABLE IF EXISTS admin_audit_log CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS app_states CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS cache_entries CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS usage_stats CASCADE;
DROP TABLE IF EXISTS snapshots CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS credit_balances CASCADE;
DROP TABLE IF EXISTS model_pricing CASCADE;
DROP TABLE IF EXISTS collaboration_members CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- USERS & AUTH
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- WORKSPACES & COLLABORATION
-- ============================================================================

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE collaboration_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin', 'owner')),
  invited_by UUID REFERENCES users(id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- ============================================================================
-- CREDITS & BILLING
-- ============================================================================

CREATE TABLE credit_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 100, -- start with 100 free credits
  lifetime_earned INTEGER NOT NULL DEFAULT 100,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE model_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id TEXT UNIQUE NOT NULL,
  model_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  credits_per_request INTEGER NOT NULL DEFAULT 1,
  credits_per_1k_input_tokens NUMERIC(10,4) DEFAULT 0,
  credits_per_1k_output_tokens NUMERIC(10,4) DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- positive = credit, negative = debit
  balance_after INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus', 'signup', 'referral')),
  description TEXT,
  model_id TEXT,
  conversation_id UUID,
  message_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CONVERSATIONS & MESSAGES
-- ============================================================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  title TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT title_length CHECK (char_length(title) <= 500)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  parts JSONB,
  model_used TEXT,
  tokens_used INTEGER DEFAULT 0,
  credits_charged INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_not_empty CHECK (char_length(content) > 0)
);

CREATE TABLE snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  description TEXT,
  state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- FILES
-- ============================================================================

CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'uploads',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- USAGE STATS
-- ============================================================================

CREATE TABLE usage_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  credits_charged INTEGER DEFAULT 0,
  estimated_cost_usd NUMERIC(10,6) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CACHE
-- ============================================================================

CREATE TABLE cache_entries (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  tags TEXT[] DEFAULT '{}',
  hit_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- APP SETTINGS
-- ============================================================================

CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  is_sensitive BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category, key)
);

-- ============================================================================
-- APP STATES (for debugging, analytics, streaming state)
-- ============================================================================

CREATE TABLE app_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  state_type TEXT NOT NULL CHECK (state_type IN ('ui', 'chat', 'editor', 'streaming', 'error', 'debug', 'analytics')),
  state_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ANALYTICS & AUDIT
-- ============================================================================

CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID,
  conversation_id UUID,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

-- Sessions
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Workspaces
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);

-- Collaboration
CREATE INDEX idx_collab_workspace ON collaboration_members(workspace_id);
CREATE INDEX idx_collab_user ON collaboration_members(user_id);

-- Credits
CREATE INDEX idx_credit_tx_user ON credit_transactions(user_id, created_at DESC);
CREATE INDEX idx_credit_tx_type ON credit_transactions(type);
CREATE INDEX idx_model_pricing_model ON model_pricing(model_id);

-- Conversations
CREATE INDEX idx_conversations_user ON conversations(user_id, updated_at DESC);
CREATE INDEX idx_conversations_workspace ON conversations(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX idx_conversations_archived ON conversations(user_id, is_archived) WHERE is_archived = false;

-- Messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at ASC);
CREATE INDEX idx_messages_role ON messages(conversation_id, role);

-- Snapshots
CREATE INDEX idx_snapshots_conversation ON snapshots(conversation_id, created_at DESC);

-- Files
CREATE INDEX idx_files_user ON files(user_id);
CREATE INDEX idx_files_conversation ON files(conversation_id);

-- Usage stats
CREATE INDEX idx_usage_user ON usage_stats(user_id, created_at DESC);
CREATE INDEX idx_usage_conversation ON usage_stats(conversation_id);

-- Cache
CREATE INDEX idx_cache_expires ON cache_entries(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_cache_tags ON cache_entries USING gin(tags);

-- App settings
CREATE INDEX idx_settings_user ON app_settings(user_id, category);

-- App states
CREATE INDEX idx_states_user ON app_states(user_id);
CREATE INDEX idx_states_type ON app_states(state_type);
CREATE INDEX idx_states_session ON app_states(session_id);

-- Analytics
CREATE INDEX idx_analytics_type ON analytics_events(event_type, created_at DESC);
CREATE INDEX idx_analytics_user ON analytics_events(user_id) WHERE user_id IS NOT NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_credit_balances_updated_at BEFORE UPDATE ON credit_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_model_pricing_updated_at BEFORE UPDATE ON model_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update conversation timestamp when message is inserted
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_message_updates_conversation
  AFTER INSERT ON messages FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- Auto-create credit balance on user creation
CREATE OR REPLACE FUNCTION create_user_credit_balance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO credit_balances (user_id, balance, lifetime_earned)
  VALUES (NEW.id, 20, 20);
  
  INSERT INTO credit_transactions (user_id, amount, balance_after, type, description)
  VALUES (NEW.id, 20, 20, 'signup', 'Welcome bonus credits');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_credit_balance
  AFTER INSERT ON users FOR EACH ROW
  EXECUTE FUNCTION create_user_credit_balance();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Deduct credits atomically
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT DEFAULT NULL,
  p_model_id TEXT DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL,
  p_message_id UUID DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, new_balance INTEGER, error_message TEXT) AS $$
DECLARE
  v_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Lock the row for update
  SELECT balance INTO v_balance FROM credit_balances WHERE user_id = p_user_id FOR UPDATE;
  
  IF v_balance IS NULL THEN
    RETURN QUERY SELECT false, 0, 'User credit balance not found'::TEXT;
    RETURN;
  END IF;
  
  IF v_balance < p_amount THEN
    RETURN QUERY SELECT false, v_balance, 'Insufficient credits'::TEXT;
    RETURN;
  END IF;
  
  v_new_balance := v_balance - p_amount;
  
  UPDATE credit_balances
  SET balance = v_new_balance, lifetime_spent = lifetime_spent + p_amount
  WHERE user_id = p_user_id;
  
  INSERT INTO credit_transactions (user_id, amount, balance_after, type, description, model_id, conversation_id, message_id)
  VALUES (p_user_id, -p_amount, v_new_balance, 'usage', p_description, p_model_id, p_conversation_id, p_message_id);
  
  RETURN QUERY SELECT true, v_new_balance, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired cache
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM cache_entries WHERE expires_at IS NOT NULL AND expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old conversations
CREATE OR REPLACE FUNCTION cleanup_old_conversations(days_to_keep INTEGER DEFAULT 30)
RETURNS TABLE(deleted_count INTEGER, freed_space_mb NUMERIC) AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM conversations
    WHERE updated_at < NOW() - (days_to_keep || ' days')::INTERVAL
      AND is_pinned = false
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO v_deleted FROM deleted;
  
  RETURN QUERY SELECT v_deleted, 0::NUMERIC;
END;
$$ LANGUAGE plpgsql;

-- Get user dashboard stats
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE(
  conversation_count INTEGER,
  message_count INTEGER,
  total_credits_used INTEGER,
  credits_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM conversations WHERE user_id = p_user_id),
    (SELECT COUNT(*)::INTEGER FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.user_id = p_user_id),
    COALESCE((SELECT lifetime_spent FROM credit_balances WHERE user_id = p_user_id), 0)::INTEGER,
    COALESCE((SELECT balance FROM credit_balances WHERE user_id = p_user_id), 0)::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow all for service role (server-side access)
CREATE POLICY "service_all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON workspaces FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON collaboration_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON credit_balances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON credit_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON usage_stats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON cache_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON app_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON app_states FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON analytics_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON admin_audit_log FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- ENABLED MODELS (admin-selected models available to all users)
-- ============================================================================

CREATE TABLE enabled_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id TEXT UNIQUE NOT NULL,
  model_name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'openrouter',
  category TEXT NOT NULL DEFAULT 'General',
  description TEXT,
  is_free BOOLEAN NOT NULL DEFAULT false,
  gems_per_message INTEGER NOT NULL DEFAULT 2,
  max_tokens INTEGER DEFAULT 4000,
  tool_support BOOLEAN NOT NULL DEFAULT false,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enabled_models_provider ON enabled_models(provider);
CREATE INDEX idx_enabled_models_enabled ON enabled_models(is_enabled) WHERE is_enabled = true;
CREATE INDEX idx_enabled_models_free ON enabled_models(is_free);

CREATE TRIGGER trg_enabled_models_updated_at BEFORE UPDATE ON enabled_models FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE enabled_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all" ON enabled_models FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- SEED: Default model pricing
-- ============================================================================

INSERT INTO model_pricing (model_id, model_name, provider, credits_per_request, credits_per_1k_input_tokens, credits_per_1k_output_tokens, is_free) VALUES
  ('openrouter:arcee-ai/trinity-large-preview:free', 'Trinity Large (Free)', 'openrouter', 0, 0, 0, true),
  ('openrouter:openai/gpt-5.2-codex', 'GPT 5.2 Codex', 'openrouter', 5, 0.5, 1.5, false),
  ('openrouter:bytedance-seed/seed-1.6-flash', 'Seed 1.6 Flash', 'openrouter', 0, 0, 0, true),
  ('openrouter:moonshotai/kimi-k2.5', 'Kimi K2.5', 'openrouter', 1, 0.1, 0.3, false),
  ('openrouter:upstage/solar-pro-3:free', 'Solar Pro 3 (Free)', 'openrouter', 0, 0, 0, true),
  ('openrouter:stepfun/step-3.5-flash:free', 'Step-3.5 Flash (Free)', 'openrouter', 0, 0, 0, true),
  ('openrouter:mistralai/mistral-7b-instruct:free', 'Mistral 7B Instruct (Free)', 'openrouter', 0, 0, 0, true),
  ('openrouter:google/gemini-2.5-flash', 'Gemini 2.5 Flash', 'openrouter', 2, 0.2, 0.6, false),
  ('openrouter:anthropic/claude-sonnet-4', 'Claude Sonnet 4', 'openrouter', 8, 0.8, 2.4, false),
  ('openrouter:openai/gpt-4.1-mini', 'GPT-4.1 Mini', 'openrouter', 3, 0.3, 0.9, false)
ON CONFLICT (model_id) DO NOTHING;

-- ============================================================================
-- SEED: Default enabled models (OpenRouter free + popular paid)
-- ============================================================================

INSERT INTO enabled_models (model_id, model_name, provider, category, description, is_free, gems_per_message, max_tokens, tool_support, sort_order) VALUES
  ('openrouter/arcee-ai/trinity-large-preview:free', 'Trinity Large', 'openrouter', 'Free', 'Free large language model from Arcee AI', true, 2, 16384, true, 1),
  ('openrouter/bytedance-seed/seed-1.6-flash', 'Seed 1.6 Flash', 'openrouter', 'Free', 'Fast model from ByteDance', true, 2, 8192, true, 2),
  ('openrouter/upstage/solar-pro-3:free', 'Solar Pro 3', 'openrouter', 'Free', 'Free model from Upstage', true, 2, 8192, true, 3),
  ('openrouter/stepfun/step-3.5-flash:free', 'Step-3.5 Flash', 'openrouter', 'Free', 'Fast free model from StepFun', true, 2, 8192, true, 4),
  ('openrouter/mistralai/mistral-7b-instruct:free', 'Mistral 7B Instruct', 'openrouter', 'Free', 'Free open-source model', true, 2, 32000, true, 5),
  ('openrouter/openai/gpt-5.2-codex', 'GPT 5.2 Codex', 'openrouter', 'Premium', 'Advanced coding model from OpenAI', false, 5, 128000, true, 10),
  ('openrouter/google/gemini-2.5-flash', 'Gemini 2.5 Flash', 'openrouter', 'Premium', 'Fast multimodal model from Google', false, 3, 1000000, true, 11),
  ('openrouter/anthropic/claude-sonnet-4', 'Claude Sonnet 4', 'openrouter', 'Premium', 'Advanced reasoning from Anthropic', false, 8, 200000, true, 12),
  ('openrouter/openai/gpt-4.1-mini', 'GPT-4.1 Mini', 'openrouter', 'Premium', 'Efficient model from OpenAI', false, 3, 128000, true, 13),
  ('openrouter/moonshotai/kimi-k2.5', 'Kimi K2.5', 'openrouter', 'Premium', 'Large context model from Moonshot AI', false, 4, 256000, true, 14)
ON CONFLICT (model_id) DO NOTHING;
