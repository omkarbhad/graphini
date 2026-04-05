import { validateSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** GET /api/workspaces/[id] — get full workspace with document */
export const GET: RequestHandler = async ({ request, params }) => {
  const user = await validateSession(request);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const workspace = await db.getDiagramWorkspace(params.id);
  if (!workspace || workspace.user_id !== user.id) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  return json(workspace);
};

/** PATCH /api/workspaces/[id] — update metadata (title, description, starred, tags) */
export const PATCH: RequestHandler = async ({ request, params }) => {
  const user = await validateSession(request);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const existing = await db.getDiagramWorkspace(params.id);
  if (!existing || existing.user_id !== user.id) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const updated = await db.updateDiagramWorkspace(params.id, {
    title: body.title,
    description: body.description,
    is_starred: body.is_starred,
    tags: body.tags
  });

  return json(updated);
};

/** DELETE /api/workspaces/[id] — delete workspace */
export const DELETE: RequestHandler = async ({ request, params }) => {
  const user = await validateSession(request);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const existing = await db.getDiagramWorkspace(params.id);
  if (!existing || existing.user_id !== user.id) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  await db.deleteDiagramWorkspace(params.id);
  return json({ success: true });
};
