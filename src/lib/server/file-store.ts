import { getDb } from '$lib/server/db';

// --- Server-side file store ---
// Persists file metadata to Supabase. Uses in-memory cache for fast reads.
// Extra fields (session_id, extracted_text, file_type) are encoded into
// storage_path as JSON since the DB schema doesn't have dedicated columns.

export interface StoredFile {
  id: string;
  sessionId: string;
  filename: string;
  mediaType: string;
  type: 'image' | 'document' | 'pdf' | 'unknown';
  size: number;
  extractedText: string;
  storedAt: number;
}

// In-memory cache (keyed by fileId)
const fileCache = new Map<string, StoredFile>();
// Session -> fileIds mapping cache
const sessionCache = new Map<string, Set<string>>();
// Track if session files have been loaded from DB
const sessionLoaded = new Set<string>();

// Encode extra fields into storage_path JSON
function encodeStoragePath(file: StoredFile): string {
  return JSON.stringify({
    sessionId: file.sessionId,
    extractedText: file.extractedText,
    fileType: file.type
  });
}

// Decode storage_path JSON back to extra fields
function decodeStoragePath(storagePath: string): {
  sessionId: string;
  extractedText: string;
  fileType: string;
} {
  try {
    const parsed = JSON.parse(storagePath);
    return {
      sessionId: parsed.sessionId || 'default',
      extractedText: parsed.extractedText || '',
      fileType: parsed.fileType || 'unknown'
    };
  } catch {
    return { sessionId: 'default', extractedText: '', fileType: 'unknown' };
  }
}

// Convert DB record to StoredFile
function dbToStoredFile(row: any): StoredFile {
  const extra = decodeStoragePath(row.storage_path);
  return {
    id: row.id,
    sessionId: extra.sessionId,
    filename: row.original_name || row.filename,
    mediaType: row.mime_type,
    type: extra.fileType as StoredFile['type'],
    size: row.size_bytes,
    extractedText: extra.extractedText,
    storedAt: new Date(row.created_at).getTime()
  };
}

export async function storeFile(file: StoredFile): Promise<void> {
  // Add to in-memory cache
  fileCache.set(file.id, file);
  const sessionSet = sessionCache.get(file.sessionId) || new Set();
  sessionSet.add(file.id);
  sessionCache.set(file.sessionId, sessionSet);

  // Persist to Supabase
  try {
    const db = getDb() as any;
    const client = db.client;
    if (client) {
      await client.from('files').insert({
        id: file.id,
        filename: file.filename,
        original_name: file.filename,
        mime_type: file.mediaType,
        size_bytes: file.size,
        storage_path: encodeStoragePath(file),
        storage_bucket: 'uploads'
      });
    }
  } catch (err) {
    console.error('[file-store] Failed to persist file to DB:', err);
  }
}

export async function getFileById(fileId: string): Promise<StoredFile | undefined> {
  // Check cache first
  if (fileCache.has(fileId)) return fileCache.get(fileId);

  // Try loading from DB
  try {
    const db = getDb() as any;
    const client = db.client;
    if (client) {
      const { data } = await client.from('files').select('*').eq('id', fileId).single();
      if (data) {
        const file = dbToStoredFile(data);
        fileCache.set(file.id, file);
        return file;
      }
    }
  } catch {
    // silent
  }
  return undefined;
}

export async function getSessionFiles(sessionId: string): Promise<StoredFile[]> {
  // If already loaded from DB, use cache
  if (sessionLoaded.has(sessionId)) {
    const ids = sessionCache.get(sessionId);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => fileCache.get(id)!)
      .filter(Boolean);
  }

  // Load from DB
  try {
    const db = getDb() as any;
    const client = db.client;
    if (client) {
      const { data } = await client
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) {
        const sessionSet = new Set<string>();
        for (const row of data) {
          const file = dbToStoredFile(row);
          if (file.sessionId === sessionId) {
            fileCache.set(file.id, file);
            sessionSet.add(file.id);
          }
        }
        sessionCache.set(sessionId, sessionSet);
        sessionLoaded.add(sessionId);
        return Array.from(sessionSet)
          .map((id) => fileCache.get(id)!)
          .filter(Boolean);
      }
    }
  } catch {
    // silent
  }

  // Fallback to cache
  const ids = sessionCache.get(sessionId);
  if (!ids) return [];
  return Array.from(ids)
    .map((id) => fileCache.get(id)!)
    .filter(Boolean);
}

export async function deleteFile(fileId: string): Promise<boolean> {
  const file = fileCache.get(fileId);

  // Remove from cache
  fileCache.delete(fileId);
  if (file) {
    const sessionSet = sessionCache.get(file.sessionId);
    if (sessionSet) sessionSet.delete(fileId);
  }

  // Remove from DB
  try {
    const db = getDb() as any;
    const client = db.client;
    if (client) {
      await client.from('files').delete().eq('id', fileId);
    }
  } catch {
    // silent
  }

  return true;
}

export async function updateFileText(fileId: string, newText: string): Promise<boolean> {
  const file = fileCache.get(fileId);
  if (!file) {
    // Try loading from DB
    const loaded = await getFileById(fileId);
    if (!loaded) return false;
    loaded.extractedText = newText;
    fileCache.set(fileId, loaded);
  } else {
    file.extractedText = newText;
  }

  // Update in DB
  try {
    const db = getDb() as any;
    const client = db.client;
    if (client) {
      const updatedFile = fileCache.get(fileId)!;
      await client
        .from('files')
        .update({ storage_path: encodeStoragePath(updatedFile) })
        .eq('id', fileId);
    }
  } catch {
    // silent
  }

  return true;
}
