import { validateSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { apiLimiter, getClientKey, rateLimitResponse } from '$lib/server/rate-limit';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

async function saveDocument(request: Request, id: string) {
  const rl = apiLimiter.check(getClientKey(request));
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs ?? 0);

  const user = await validateSession(request);
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const existing = await db.getDiagramWorkspace(id);
  if (!existing || existing.user_id !== user.id) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  if (!body.document) {
    return json({ error: 'Missing document' }, { status: 400 });
  }

  await db.updateDiagramWorkspaceDocument(id, body.document, {
    element_count: body.element_count,
    diagram_type: body.diagram_type
  });

  return json({ success: true });
}

/** PUT /api/workspaces/[id]/document — save workspace document (auto-save target) */
export const PUT: RequestHandler = ({ request, params }) => saveDocument(request, params.id);

/** POST /api/workspaces/[id]/document — same as PUT; used by navigator.sendBeacon on unload */
export const POST: RequestHandler = ({ request, params }) => saveDocument(request, params.id);
