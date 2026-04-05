-- SQLite Database Schema for Model Management
-- File: database/models.db

-- Drop existing tables if they exist (for fresh start)
DROP TABLE IF EXISTS models;
DROP TABLE IF EXISTS providers;

-- Providers Table - API Key as Primary Key
CREATE TABLE providers (
  api_key TEXT PRIMARY KEY,                    -- API key as primary key
  provider_id TEXT NOT NULL,                   -- openai, anthropic, openrouter, etc.
  provider_name TEXT NOT NULL,                 -- OpenAI, Anthropic, OpenRouter
  base_url TEXT,                              -- Base URL for API calls
  description TEXT,                           -- Provider description
  requires_api_key BOOLEAN DEFAULT 1,         -- Whether API key is required
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Models Table - Proper Model IDs and Names
CREATE TABLE models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_api_key TEXT NOT NULL,              -- Foreign key to providers.api_key
  model_id TEXT NOT NULL,                      -- gpt-4, claude-3-5-sonnet (used for API calls)
  model_name TEXT NOT NULL,                    -- GPT-4, Claude 3.5 Sonnet (display name)
  category TEXT,                              -- GPT, Claude, Premium, Free, etc.
  tool_support BOOLEAN DEFAULT 0,             -- Whether model supports tool calling
  max_tokens INTEGER DEFAULT 4096,            -- Maximum token limit
  cost_per_token REAL DEFAULT 0.0,            -- Cost per 1K tokens
  description TEXT,                           -- Model description
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_api_key) REFERENCES providers(api_key) ON DELETE CASCADE,
  UNIQUE(provider_api_key, model_id)         -- No duplicate models per provider
);

-- Create indexes for better performance
CREATE INDEX idx_models_provider_api_key ON models(provider_api_key);
CREATE INDEX idx_models_model_id ON models(model_id);
CREATE INDEX idx_models_category ON models(category);

-- Insert sample data for testing
INSERT INTO providers (api_key, provider_id, provider_name, base_url, description, requires_api_key) VALUES
  ('sk-test-openai-key', 'openai', 'OpenAI', 'https://api.openai.com/v1', 'OpenAI API provider - GPT models', 1),
  ('sk-ant-test-anthropic-key', 'anthropic', 'Anthropic', 'https://api.anthropic.com', 'Anthropic Claude API provider', 1),
  ('sk-or-test-openrouter-key', 'openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1', 'OpenRouter API provider - multiple models', 1),
  ('kilo-no-key-required', 'kilo', 'Kilo', '', 'Custom model provider - no API key required', 0);

INSERT INTO models (provider_api_key, model_id, model_name, category, tool_support, max_tokens, cost_per_token, description) VALUES
  -- OpenAI Models
  ('sk-test-openai-key', 'gpt-4', 'GPT-4', 'GPT', 1, 8192, 0.00003, 'Latest GPT-4 model'),
  ('sk-test-openai-key', 'gpt-4-turbo', 'GPT-4 Turbo', 'GPT', 1, 128000, 0.00001, 'Latest GPT-4 Turbo model'),
  ('sk-test-openai-key', 'gpt-4o', 'GPT-4o', 'GPT', 1, 128000, 0.000015, 'Latest GPT-4o model'),
  
  -- Anthropic Models
  ('sk-ant-test-anthropic-key', 'claude-3-5-sonnet', 'Claude 3.5 Sonnet', 'Claude', 1, 200000, 0.000015, 'Most capable Claude model'),
  ('sk-ant-test-anthropic-key', 'claude-3-5-haiku', 'Claude 3.5 Haiku', 'Claude', 1, 200000, 0.000001, 'Fast, efficient Claude'),
  
  -- OpenRouter Models
  ('sk-or-test-openrouter-key', 'anthropic/claude-3.5-sonnet', 'Claude 3.5 Sonnet', 'Premium', 1, 200000, 0.000015, 'Via OpenRouter - Most capable Claude model'),
  ('sk-or-test-openrouter-key', 'openai/gpt-4o', 'GPT-4o', 'Premium', 1, 128000, 0.000015, 'Via OpenRouter - Latest GPT-4o model'),
  ('sk-or-test-openrouter-key', 'google/gemini-pro', 'Gemini Pro', 'Google', 1, 32768, 0.000025, 'Via OpenRouter - Google multimodal model'),
  ('sk-or-test-openrouter-key', 'meta-llama/llama-3.1-8b-instruct:free', 'Llama 3.1 8B', 'Free', 0, 4096, 0.0, 'Free Llama model via OpenRouter'),
  
  -- Kilo Models (No API Key)
  ('kilo-no-key-required', 'custom', 'Custom Model', 'Custom', 0, 4000, 0.0, 'Your own model endpoint - no API key required');

-- Create a view for easy provider+model queries
CREATE VIEW provider_models AS
SELECT 
  p.api_key,
  p.provider_id,
  p.provider_name,
  p.base_url,
  p.description as provider_description,
  p.requires_api_key,
  m.model_id,
  m.model_name,
  m.category,
  m.tool_support,
  m.max_tokens,
  m.cost_per_token,
  m.description as model_description
FROM providers p
LEFT JOIN models m ON p.api_key = m.provider_api_key
ORDER BY p.provider_name, m.model_name;
