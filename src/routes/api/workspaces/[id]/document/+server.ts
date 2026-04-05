import { validateSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** PUT /api/workspaces/[id]/document — save workspace document (auto-save target) */
export const PUT: RequestHandler = async ({ request, params }) => {
  const user = await validateSession(request);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const existing = await db.getDiagramWorkspace(params.id);
  if (!existing || existing.user_id !== user.id) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  if (!body.document) {
    return json({ error: 'Missing document' }, { status: 400 });
  }

  await db.updateDiagramWorkspaceDocument(params.id, body.document, {
    element_count: body.element_count,
    diagram_type: body.diagram_type
  });

  return json({ success: true });
};
