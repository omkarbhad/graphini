/**
 * Single Conversation API Endpoint
 * GET    /api/chat/conversations/[id] - Get conversation with messages
 * PATCH  /api/chat/conversations/[id] - Update conversation
 * DELETE /api/chat/conversations/[id] - Delete conversation
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import {
  getConversation,
  updateConversation,
  deleteConversation,
  listMessages
} from '$lib/server/db';

// GET /api/chat/conversations/[id]
export async function GET(event: RequestEvent) {
  try {
    const { id } = event.params;

    if (!id) {
      return json(
        { error: 'Invalid Request', message: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Get conversation
    const conversation = await getConversation(id);

    if (!conversation) {
      return json({ error: 'Not Found', message: 'Conversation not found' }, { status: 404 });
    }

    // Get messages
    const url = new URL(event.request.url);
    const includeMessages = url.searchParams.get('include_messages') !== 'false';
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    let messages: Awaited<ReturnType<typeof listMessages>> = [];
    if (includeMessages) {
      messages = await listMessages(id, { limit, offset });
    }

    return json({
      conversation,
      messages,
      pagination: includeMessages ? { limit, offset, total: messages.length } : undefined
    });
  } catch (error) {
    console.error('Failed to get conversation:', error);
    return json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to get conversation'
      },
      { status: 500 }
    );
  }
}

// PATCH /api/chat/conversations/[id]
export async function PATCH(event: RequestEvent) {
  try {
    const { id } = event.params;

    if (!id) {
      return json(
        { error: 'Invalid Request', message: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    const body = await event.request.json();

    if (!body || typeof body !== 'object') {
      return json(
        { error: 'Invalid Request', message: 'Request body must be an object' },
        { status: 400 }
      );
    }

    const { title, metadata } = body as {
      title?: string;
      metadata?: Record<string, unknown>;
    };

    // Validate title length
    if (title && typeof title === 'string' && title.length > 200) {
      return json(
        { error: 'Invalid Title', message: 'Title must be 200 characters or less' },
        { status: 400 }
      );
    }

    // Check if conversation exists
    const existing = await getConversation(id);
    if (!existing) {
      return json({ error: 'Not Found', message: 'Conversation not found' }, { status: 404 });
    }

    // Update conversation
    const updateData: { title?: string; metadata?: Record<string, unknown> } = {};
    if (title !== undefined) updateData.title = title;
    if (metadata !== undefined) updateData.metadata = metadata;

    const conversation = await updateConversation(id, updateData);

    return json({ conversation });
  } catch (error) {
    console.error('Failed to update conversation:', error);
    return json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to update conversation'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/chat/conversations/[id]
export async function DELETE(event: RequestEvent) {
  try {
    const { id } = event.params;

    if (!id) {
      return json(
        { error: 'Invalid Request', message: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Check if conversation exists
    const existing = await getConversation(id);
    if (!existing) {
      return json({ error: 'Not Found', message: 'Conversation not found' }, { status: 404 });
    }

    // Delete conversation (cascade will delete messages and snapshots)
    await deleteConversation(id);

    return json({ success: true, message: 'Conversation deleted' });
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    return json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to delete conversation'
      },
      { status: 500 }
    );
  }
}
