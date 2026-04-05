/**
 * File Store (Legacy Stub)
 * The filesystem feature has been replaced by the workspace system.
 * These stubs exist for backward compatibility with upload/chat routes.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const UPLOAD_DIR = path.join(os.tmpdir(), 'graphini-uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export interface StoredFile {
  id: string;
  sessionId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  mediaType: string;
  type: string;
  size: number;
  path: string;
  extractedText?: string;
  createdAt: number;
  storedAt: number;
}

const fileStore = new Map<string, StoredFile>();

export function storeFile(data: {
  sessionId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  extractedText?: string;
}): StoredFile {
  const id = crypto.randomUUID();
  const filePath = path.join(UPLOAD_DIR, `${id}-${data.filename}`);
  fs.writeFileSync(filePath, data.buffer);

  const stored: StoredFile = {
    id,
    sessionId: data.sessionId,
    filename: data.filename,
    originalName: data.originalName,
    mimeType: data.mimeType,
    mediaType: data.mimeType,
    type: data.mimeType.split('/')[0] || 'unknown',
    size: data.buffer.length,
    path: filePath,
    extractedText: data.extractedText,
    createdAt: Date.now(),
    storedAt: Date.now()
  };

  fileStore.set(id, stored);
  return stored;
}

export function getFileById(id: string): StoredFile | undefined {
  return fileStore.get(id);
}

export function getSessionFiles(sessionId: string): StoredFile[] {
  return Array.from(fileStore.values()).filter((f) => f.sessionId === sessionId);
}

export function deleteFile(id: string): boolean {
  const file = fileStore.get(id);
  if (!file) return false;
  try {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
  } catch { /* ignore */ }
  fileStore.delete(id);
  return true;
}
