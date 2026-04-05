-- ============================================================================
-- Add session_id, extracted_text, and file_type to files table for persistence
-- ============================================================================

-- Add session_id column (chat session identifier, not auth session)
ALTER TABLE files ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Add extracted_text column for storing parsed/extracted content
ALTER TABLE files ADD COLUMN IF NOT EXISTS extracted_text TEXT DEFAULT '';

-- Add file_type column (image, document, pdf, unknown)
ALTER TABLE files ADD COLUMN IF NOT EXISTS file_type TEXT DEFAULT 'unknown';

-- Make conversation_id nullable (files may exist before conversation is created)
ALTER TABLE files ALTER COLUMN conversation_id DROP NOT NULL;

-- Index for session-based lookups
CREATE INDEX IF NOT EXISTS idx_files_session ON files(session_id, created_at DESC);
