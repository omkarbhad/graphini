/**
 * User Data API
 * Stores per-file auxiliary data (document markdown, UI state, etc.) in the DB
 * Uses the app_settings table with category='file_data' and key=fileId
 */

import { extractToken, validateSession } from '$lib/server/auth';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { settingsManager } from '$lib/server/state-manager';

/** GET - Load file aux data for a specific file */
export const GET: RequestHandler = async ({ request, url }) => {
  const token = extractToken(request);
  if (!token) return json({ error: 'Unauthorized' }, { status: 401 });

  const session = await validateSession(token);
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

  const fileId = url.searchParams.get('fileId');
  if (!fileId) return json({ error: 'Missing fileId' }, { status: 400 });

  const data = await settingsManager.get<Record<string, unknown>>(
    session.user.id,
    'file_data',
    fileId,
    {}
  );

  return json({ data });
};

/** PUT - Save file aux data for a specific file */
export const PUT: RequestHandler = async ({ request }) => {
  const token = extractToken(request);
  if (!token) return json({ error: 'Unauthorized' }, { status: 401 });

  const session = await validateSession(token);
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { fileId, data } = body;

    if (!fileId) return json({ error: 'Missing fileId' }, { status: 400 });
    if (!data || typeof data !== 'object') {
      return json({ error: 'Invalid data' }, { status: 400 });
    }

    // Merge with existing data
    const existing = await settingsManager.get<Record<string, unknown>>(
      session.user.id,
      'file_data',
      fileId,
      {}
    );

    const merged = { ...existing, ...data };
    await settingsManager.set(session.user.id, 'file_data', fileId, merged);

    return json({ success: true });
  } catch (e: any) {
    return json({ error: e?.message || 'Failed to save data' }, { status: 500 });
  }
};
