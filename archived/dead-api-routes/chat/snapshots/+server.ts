/**
 * Snapshots API Endpoint
 * GET  /api/chat/snapshots - List snapshots for a conversation
 * POST /api/chat/snapshots - Create snapshot
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import { getConversation, createSnapshot, listSnapshots, type Snapshot } from '$lib/server/db';

// GET /api/chat/snapshots
export async function GET(event: RequestEvent) {
  try {
    const url = new URL(event.request.url);
    const conversationId = url.searchParams.get('conversation_id');

    if (!conversationId) {
      return json(
        { error: 'Invalid Request', message: 'conversation_id query parameter is required' },
        { status: 400 }
      );
    }

    // Check if conversation exists
    const conversation = await getConversation(conversationId);
    if (!conversation) {
      return json({ error: 'Not Found', message: 'Conversation not found' }, { status: 404 });
    }

    // Get snapshots
    const snapshots = await listSnapshots(conversationId);

    return json({ snapshots });
  } catch (error) {
    console.error('Failed to list snapshots:', error);
    return json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to list snapshots'
      },
      { status: 500 }
    );
  }
}

// POST /api/chat/snapshots
export async function POST(event: RequestEvent) {
  try {
    const body = await event.request.json();

    if (!body || typeof body !== 'object') {
      return json(
        { error: 'Invalid Request', message: 'Request body must be an object' },
        { status: 400 }
      );
    }

    const { conversation_id, message_id, description, state } = body as {
      conversation_id?: string;
      message_id?: string;
      description?: string;
      state?: Record<string, unknown>;
    };

    // Validate required fields
    if (!conversation_id || !state) {
      return json(
        { error: 'Invalid Request', message: 'conversation_id and state are required' },
        { status: 400 }
      );
    }

    // Check if conversation exists
    const conversation = await getConversation(conversation_id);
    if (!conversation) {
      return json({ error: 'Not Found', message: 'Conversation not found' }, { status: 404 });
    }

    // Validate description length
    if (description && typeof description === 'string' && description.length > 500) {
      return json(
        { error: 'Invalid Description', message: 'Description must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Create snapshot
    const snapshot = await createSnapshot({
      conversation_id,
      message_id: message_id || null,
      description: description || null,
      state
    });

    return json({ snapshot }, { status: 201 });
  } catch (error) {
    console.error('Failed to create snapshot:', error);
    return json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to create snapshot'
      },
      { status: 500 }
    );
  }
}
