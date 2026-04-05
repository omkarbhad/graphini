import { deleteFile, getFileById, getSessionFiles, updateFileText } from '$lib/server/file-store';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * File Manager API — allows listing, reading, updating, and deleting stored files.
 * Used by the fileManager tool in the chat agent.
 *
 * GET /api/files?sessionId=xxx — list all files for a session
 * GET /api/files?fileId=xxx — get a specific file's content
 * DELETE /api/files?fileId=xxx — delete a file
 * PATCH /api/files — update file extracted text { fileId, text }
 */

export const GET: RequestHandler = async ({ url }) => {
  const sessionId = url.searchParams.get('sessionId');
  const fileId = url.searchParams.get('fileId');

  if (fileId) {
    const file = await getFileById(fileId);
    if (!file) return error(404, 'File not found');
    return json({
      success: true,
      file: {
        id: file.id,
        filename: file.filename,
        mediaType: file.mediaType,
        type: file.type,
        size: file.size,
        extractedText: file.extractedText,
        storedAt: file.storedAt
      }
    });
  }

  if (sessionId) {
    const files = await getSessionFiles(sessionId);
    return json({
      success: true,
      files: files.map((f) => ({
        id: f.id,
        filename: f.filename,
        mediaType: f.mediaType,
        type: f.type,
        size: f.size,
        storedAt: f.storedAt,
        hasText: !!f.extractedText,
        textLength: f.extractedText?.length || 0
      }))
    });
  }

  return error(400, 'Provide sessionId or fileId');
};

export const DELETE: RequestHandler = async ({ url }) => {
  const fileId = url.searchParams.get('fileId');
  if (!fileId) return error(400, 'fileId required');

  const success = await deleteFile(fileId);
  if (!success) return error(404, 'File not found');
  return json({ success: true });
};

export const PATCH: RequestHandler = async ({ request }) => {
  const { fileId, text } = await request.json();
  if (!fileId || typeof text !== 'string') {
    return error(400, 'fileId and text required');
  }

  const success = await updateFileText(fileId, text);
  if (!success) return error(404, 'File not found');
  return json({ success: true });
};
