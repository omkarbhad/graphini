-- ============================================================================
-- Add File Storage Support to Chat Schema
-- ============================================================================

-- Files table for storing file metadata
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL, -- Supabase Storage path
  storage_bucket TEXT NOT NULL DEFAULT 'chat-attachments',
  uploaded_by TEXT, -- For future auth integration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT file_size_positive CHECK (size_bytes > 0),
  CONSTRAINT file_size_limit CHECK (size_bytes <= 104857600), -- 100MB max
  CONSTRAINT filename_not_empty CHECK (char_length(filename) > 0),
  CONSTRAINT storage_path_not_empty CHECK (char_length(storage_path) > 0)
);

-- Indexes for files
CREATE INDEX idx_files_conversation ON files(conversation_id, created_at DESC);
CREATE INDEX idx_files_message ON files(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX idx_files_created ON files(created_at DESC);

-- Update messages table to reference files
ALTER TABLE messages ADD COLUMN file_ids UUID[] DEFAULT '{}';

-- Function to link files to messages
CREATE OR REPLACE FUNCTION link_files_to_message(
  p_message_id UUID,
  p_file_ids UUID[]
)
RETURNS VOID AS $$
BEGIN
  -- Update message with file references
  UPDATE messages
  SET file_ids = array_cat(file_ids, p_file_ids)
  WHERE id = p_message_id;

  -- Update files with message reference
  UPDATE files
  SET message_id = p_message_id
  WHERE id = ANY(p_file_ids) AND message_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup orphaned files (files not linked to messages)
CREATE OR REPLACE FUNCTION cleanup_orphaned_files(days_old INTEGER DEFAULT 1)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH orphaned_files AS (
    DELETE FROM files
    WHERE message_id IS NULL
      AND created_at < NOW() - (days_old || ' days')::INTERVAL
    RETURNING storage_path, storage_bucket
  )
  SELECT COUNT(*) INTO deleted_count FROM orphaned_files;

  -- Note: Actual file deletion from storage would need to be handled separately
  -- This just removes database records for orphaned files

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security for files
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Policies for files (allow all for now, restrict when auth is added)
CREATE POLICY "Allow all operations on files" ON files
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- Sample file data (for testing)
-- ============================================================================

-- This would be inserted when files are uploaded via the API
-- INSERT INTO files (conversation_id, filename, original_name, mime_type, size_bytes, storage_path)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'diagram.png', 'my-diagram.png', 'image/png', 12345, 'chat-attachments/diagram.png');

-- ============================================================================
-- Usage Examples
-- ============================================================================

-- Upload a file and link to message:
-- 1. Upload file to Supabase Storage
-- 2. Insert file record: INSERT INTO files (...) VALUES (...) RETURNING id
-- 3. Link to message: SELECT link_files_to_message('message-id', ARRAY[file_id])

-- Get files for a message:
-- SELECT * FROM files WHERE message_id = 'message-id'

-- Get files for a conversation:
-- SELECT * FROM files WHERE conversation_id = 'conversation-id' ORDER BY created_at DESC

-- Cleanup orphaned files:
-- SELECT cleanup_orphaned_files(7); -- Delete files older than 7 days that aren't linked to messages
