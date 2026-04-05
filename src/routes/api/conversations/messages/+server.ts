import { validateSession } from '$lib/server/auth';
import { getDb, type Message } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** List messages for a conversation */
export const GET: RequestHandler = async ({ request, url }) => {
  try {
    const user = await validateSession(request);
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const conversationId = url.searchParams.get('conversation_id');
    if (!conversationId) return json({ error: 'Missing conversation_id' }, { status: 400 });

    const db = getDb();
    const messages = await db.listMessages(conversationId);

    return json({ messages });
  } catch (err: any) {
    return json({ error: err?.message || 'Failed to list messages' }, { status: 500 });
  }
};

/** Sync messages (bulk create) for a conversation */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const user = await validateSession(request);
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { conversation_id, messages } = body;

    if (!conversation_id) return json({ error: 'Missing conversation_id' }, { status: 400 });
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'Missing or empty messages array' }, { status: 400 });
    }

    const db = getDb();

    // Verify conversation belongs to user
    const conv = await db.getConversation(conversation_id);
    if (!conv || conv.user_id !== user.id) {
      return json({ error: 'Conversation not found' }, { status: 404 });
    }

    const created: Message[] = [];
    for (const msg of messages) {
      const saved = await db.createMessage({
        conversation_id,
        role: msg.role,
        content: msg.content || '',
        parts: msg.parts || null,
        metadata: msg.metadata || {}
      });
      created.push(saved);
    }

    return json({ messages: created }, { status: 201 });
  } catch (err: any) {
    return json({ error: err?.message || 'Failed to sync messages' }, { status: 500 });
  }
};
