/**
 * File Management API Endpoint
 * GET    /api/chat/files/[id] - Get file metadata
 * DELETE /api/chat/files/[id] - Delete file
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const BUCKET_NAME = 'chat-attachments';

// GET /api/chat/files/[id]
export async function GET(event: RequestEvent) {
  try {
    const { id } = event.params;

    if (!id) {
      return json({ error: 'File ID is required' }, { status: 400 });
    }

    // Get file metadata from database
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .select('*')
      .eq('id', id)
      .single();

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return json({ error: 'File not found' }, { status: 404 });
      }
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Get public URL
    const {
      data: { publicUrl }
    } = supabase.storage.from(fileRecord.storage_bucket).getPublicUrl(fileRecord.storage_path);

    return json({
      file: {
        bucket: fileRecord.storage_bucket,
        conversationId: fileRecord.conversation_id,
        createdAt: fileRecord.created_at,
        filename: fileRecord.filename,
        id: fileRecord.id,
        messageId: fileRecord.message_id,
        mimeType: fileRecord.mime_type,
        originalName: fileRecord.original_name,
        size: fileRecord.size_bytes,
        storagePath: fileRecord.storage_path,
        url: publicUrl
      }
    });
  } catch (error) {
    console.error('Failed to get file:', error);
    return json(
      {
        error: 'Failed to get file',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/chat/files/[id]
export async function DELETE(event: RequestEvent) {
  try {
    const { id } = event.params;

    if (!id) {
      return json({ error: 'File ID is required' }, { status: 400 });
    }

    // Get file metadata first
    const { data: fileRecord, error: getError } = await supabase
      .from('files')
      .select('storage_path, storage_bucket')
      .eq('id', id)
      .single();

    if (getError) {
      if (getError.code === 'PGRST116') {
        return json({ error: 'File not found' }, { status: 404 });
      }
      throw new Error(`Failed to get file: ${getError.message}`);
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(fileRecord.storage_bucket)
      .remove([fileRecord.storage_path]);

    if (storageError) {
      console.warn('Failed to delete file from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: dbError } = await supabase.from('files').delete().eq('id', id);

    if (dbError) {
      throw new Error(`Failed to delete file record: ${dbError.message}`);
    }

    return json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Failed to delete file:', error);
    return json(
      {
        error: 'Failed to delete file',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
