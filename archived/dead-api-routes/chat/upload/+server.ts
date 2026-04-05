/**
 * File Upload API Endpoint
 * POST /api/chat/upload - Upload files for chat attachments
 * GET  /api/chat/files/[id] - Get file metadata
 * DELETE /api/chat/files/[id] - Delete file
 */

import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from '$env/static/private';
import { createClient } from '@supabase/supabase-js';
import { json, type RequestEvent } from '@sveltejs/kit';

// Initialize Supabase client for file operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Storage bucket name
const BUCKET_NAME = 'chat-attachments';

// File type validation
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Code files
  'text/javascript',
  'text/typescript',
  'text/html',
  'text/css',
  'application/json',
  'application/xml',
  'text/xml',
  // Archives
  'application/zip',
  'application/x-tar',
  'application/gzip'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_FILES_PER_REQUEST = 5;

// Validate file
function validateFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size ${file.size} exceeds maximum ${MAX_FILE_SIZE} bytes` };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} not allowed` };
  }

  return { valid: true };
}

// Generate safe filename
function generateSafeFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop() || '';
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
  return `${timestamp}_${random}_${baseName}.${extension}`;
}

// Upload file to Supabase Storage
async function uploadFileToStorage(
  file: File,
  filename: string
): Promise<{ path: string; url: string }> {
  const fileBuffer = await file.arrayBuffer();

  const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(filename, fileBuffer, {
    contentType: file.type,
    upsert: false
  });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);

  return { path: data.path, url: publicUrl };
}

// POST /api/chat/upload
export async function POST(event: RequestEvent) {
  try {
    const formData = await event.request.formData();
    const files = formData.getAll('files') as File[];
    const conversationId = formData.get('conversationId') as string;

    // Validate conversation ID
    if (!conversationId) {
      return json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Validate file count
    if (!files || files.length === 0) {
      return json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return json(
        { error: `Maximum ${MAX_FILES_PER_REQUEST} files allowed per request` },
        { status: 400 }
      );
    }

    // Validate each file
    const validatedFiles: File[] = [];
    const validationErrors: string[] = [];

    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        validationErrors.push(`${file.name}: ${validation.error}`);
      } else {
        validatedFiles.push(file);
      }
    }

    if (validationErrors.length > 0) {
      return json({ error: 'File validation failed', details: validationErrors }, { status: 400 });
    }

    // Upload files and save metadata
    const uploadedFiles: Array<{
      createdAt: string;
      filename: string;
      id: string;
      mimeType: string;
      originalName: string;
      size: number;
      url: string;
    }> = [];

    for (const file of validatedFiles) {
      try {
        // Generate safe filename
        const safeFilename = generateSafeFilename(file.name);

        // Upload to storage
        const { path, url } = await uploadFileToStorage(file, safeFilename);

        // Save file metadata to database
        const { data: fileRecord, error: dbError } = await supabase
          .from('files')
          .insert({
            conversation_id: conversationId,
            filename: safeFilename,
            mime_type: file.type,
            original_name: file.name,
            size_bytes: file.size,
            storage_bucket: BUCKET_NAME,
            storage_path: path
          })
          .select()
          .single();

        if (dbError) {
          // If database insert fails, try to delete uploaded file
          await supabase.storage.from(BUCKET_NAME).remove([path]);
          throw new Error(`Failed to save file metadata: ${dbError.message}`);
        }

        uploadedFiles.push({
          createdAt: fileRecord.created_at,
          filename: safeFilename,
          id: fileRecord.id,
          mimeType: file.type,
          originalName: file.name,
          size: file.size,
          url: url
        });
      } catch (error) {
        console.error('Failed to upload file:', file.name, error);
        // Continue with other files but collect errors
        validationErrors.push(`${file.name}: Upload failed`);
      }
    }

    if (uploadedFiles.length === 0) {
      return json({ error: 'All file uploads failed', details: validationErrors }, { status: 500 });
    }

    return json({
      success: true,
      files: uploadedFiles,
      warnings: validationErrors.length > 0 ? validationErrors : undefined
    });
  } catch (error) {
    console.error('File upload error:', error);
    return json(
      {
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
