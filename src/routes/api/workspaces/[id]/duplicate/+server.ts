import { validateSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** POST /api/workspaces/[id]/duplicate — duplicate a workspace */
export const POST: RequestHandler = async ({ request, params }) => {
  const user = await validateSession(request);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const existing = await db.getDiagramWorkspace(params.id);
  if (!existing || existing.user_id !== user.id) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const newTitle = body.title || `${existing.title} (Copy)`;

  const duplicate = await db.duplicateDiagramWorkspace(params.id, newTitle);
  return json(duplicate, { status: 201 });
};
