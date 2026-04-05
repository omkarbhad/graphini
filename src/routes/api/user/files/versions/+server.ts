/**
 * File Versions API
 * GET  - List versions for a file
 * POST - Create a new version for a file
 */

import { validateSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** List versions for a file */
export const GET: RequestHandler = async ({ request, url }) => {
  const user = await validateSession(request);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const fileId = url.searchParams.get('fileId');
  if (!fileId) return json({ error: 'fileId query param required' }, { status: 400 });

  try {
    const versions = await getDb().listFileVersions(fileId);
    return json({ versions });
  } catch (err: any) {
    return json({ error: err?.message || 'Failed to list versions' }, { status: 500 });
  }
};

/** Create a new file version */
export const POST: RequestHandler = async ({ request }) => {
  const user = await validateSession(request);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { file_id, version, content_mermaid, content_document } = body;

    if (!file_id || version == null) {
      return json({ error: 'file_id and version are required' }, { status: 400 });
    }

    const db = getDb();
    const created = await db.createFileVersion({
      file_id,
      user_id: user.id,
      version,
      content_mermaid: content_mermaid ?? '',
      content_document: content_document ?? ''
    });

    // Prune old versions, keep latest 50
    await db.pruneFileVersions(file_id, 50);

    return json({ version: created });
  } catch (err: any) {
    return json({ error: err?.message || 'Failed to create version' }, { status: 500 });
  }
};
