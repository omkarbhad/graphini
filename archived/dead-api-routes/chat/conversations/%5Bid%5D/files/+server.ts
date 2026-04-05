/**
 * Conversation Files API Endpoint
 * GET /api/chat/conversations/[id]/files - Get all files for a conversation
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// GET /api/chat/conversations/[id]/files
export async function GET(event: RequestEvent) {
  try {
    const { id } = event.params;

    if (!id) {
      return json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Check if conversation exists
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', id)
      .single();

    if (convError) {
      if (convError.code === 'PGRST116') {
        return json({ error: 'Conversation not found' }, { status: 404 });
      }
      throw new Error(`Failed to check conversation: ${convError.message}`);
    }

    // Get files for conversation
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: false });

    if (filesError) {
      throw new Error(`Failed to get files: ${filesError.message}`);
    }

    // Add public URLs to files
    const filesWithUrls = files.map((file) => {
      const {
        data: { publicUrl }
      } = supabase.storage.from(file.storage_bucket).getPublicUrl(file.storage_path);

      return {
        bucket: file.storage_bucket,
        conversationId: file.conversation_id,
        createdAt: file.created_at,
        filename: file.filename,
        id: file.id,
        messageId: file.message_id,
        mimeType: file.mime_type,
        originalName: file.original_name,
        size: file.size_bytes,
        storagePath: file.storage_path,
        url: publicUrl
      };
    });

    return json({
      files: filesWithUrls,
      total: filesWithUrls.length
    });
  } catch (error) {
    console.error('Failed to get conversation files:', error);
    return json(
      {
        error: 'Failed to get files',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
