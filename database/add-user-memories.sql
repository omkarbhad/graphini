-- Add user_memories table for context-aware chat
-- This table stores user preferences and context for better AI responses

CREATE TABLE IF NOT EXISTS user_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('preference', 'context', 'instruction', 'fact')),
  content TEXT NOT NULL,
  importance INTEGER DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Constraints
  CONSTRAINT content_not_empty CHECK (char_length(content) > 0),
  CONSTRAINT content_length CHECK (char_length(content) <= 2000)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_type ON user_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_user_memories_expires ON user_memories(expires_at) WHERE expires_at IS NOT NULL;

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_user_memories_updated_at 
  BEFORE UPDATE ON user_memories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();