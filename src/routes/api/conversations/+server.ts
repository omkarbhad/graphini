import { extractToken, validateSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** List conversations for the authenticated user */
export const GET: RequestHandler = async ({ request, url }) => {
  try {
    const token = extractToken(request);
    if (!token) return json({ error: 'Unauthorized' }, { status: 401 });

    const session = await validateSession(token);
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const includeArchived = url.searchParams.get('archived') === 'true';

    const conversations = await db.listConversations({
      user_id: session.user.id,
      include_archived: includeArchived,
      limit,
      offset
    });

    return json({ conversations });
  } catch (err: any) {
    return json({ error: err?.message || 'Failed to list conversations' }, { status: 500 });
  }
};

/** Delete a conversation */
export const DELETE: RequestHandler = async ({ request, url }) => {
  try {
    const token = extractToken(request);
    if (!token) return json({ error: 'Unauthorized' }, { status: 401 });

    const session = await validateSession(token);
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

    const id = url.searchParams.get('id');
    if (!id) return json({ error: 'Missing conversation id' }, { status: 400 });

    const db = getDb();
    await db.deleteConversation(id);

    return json({ success: true });
  } catch (err: any) {
    return json({ error: err?.message || 'Failed to delete conversation' }, { status: 500 });
  }
};

/** Create a new conversation */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const token = extractToken(request);
    if (!token) return json({ error: 'Unauthorized' }, { status: 401 });

    const session = await validateSession(token);
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const db = getDb();

    const conversation = await db.createConversation({
      user_id: session.user.id,
      title: body.title || 'New Chat',
      metadata: body.metadata || {}
    });

    return json({ conversation }, { status: 201 });
  } catch (err: any) {
    return json({ error: err?.message || 'Failed to create conversation' }, { status: 500 });
  }
};
