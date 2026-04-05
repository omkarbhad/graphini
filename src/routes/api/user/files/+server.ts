/**
 * User Files API
 * Syncs user diagram file list to/from DB via settingsManager
 * GET  - Load user file list from DB
 * PUT  - Save/sync user file list to DB
 */

import { validateSession } from '$lib/server/auth';
import { settingsManager } from '$lib/server/state-manager';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const CATEGORY = 'user_files';
const KEY = 'file_list';

/** Load user file list from DB */
export const GET: RequestHandler = async ({ request }) => {
  const user = await validateSession(request);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const files = await settingsManager.get<unknown[]>(user.id, CATEGORY, KEY, []);
    return json({ files });
  } catch (err: any) {
    return json({ error: err?.message || 'Failed to load files' }, { status: 500 });
  }
};

/** Save/sync user file list to DB */
export const PUT: RequestHandler = async ({ request }) => {
  const user = await validateSession(request);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { files } = body;

    if (!Array.isArray(files)) {
      return json({ error: 'files must be an array' }, { status: 400 });
    }

    await settingsManager.set(user.id, CATEGORY, KEY, files);
    return json({ success: true });
  } catch (err: any) {
    return json({ error: err?.message || 'Failed to save files' }, { status: 500 });
  }
};
