/**
 * Messages API Endpoint
 * GET  /api/chat/conversations/[id]/messages - List messages
 * POST /api/chat/conversations/[id]/messages - Create message
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import { getConversation, createMessage, listMessages, type Message } from '$lib/server/db';

// GET /api/chat/conversations/[id]/messages
export async function GET(event: RequestEvent) {
  try {
    const { id } = event.params;

    if (!id) {
      return json(
        { error: 'Invalid Request', message: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Check if conversation exists
    const conversation = await getConversation(id);
    if (!conversation) {
      return json({ error: 'Not Found', message: 'Conversation not found' }, { status: 404 });
    }

    // Get pagination parameters
    const url = new URL(event.request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    // Validate pagination
    if (limit < 1 || limit > 200) {
      return json(
        { error: 'Invalid limit', message: 'Limit must be between 1 and 200' },
        { status: 400 }
      );
    }

    if (offset < 0) {
      return json(
        { error: 'Invalid offset', message: 'Offset must be non-negative' },
        { status: 400 }
      );
    }

    // Get messages
    const messages = await listMessages(id, { limit, offset });

    return json({
      messages,
      pagination: {
        limit,
        offset,
        total: messages.length,
        has_more: messages.length === limit
      }
    });
  } catch (error) {
    console.error('Failed to list messages:', error);
    return json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to list messages'
      },
      { status: 500 }
    );
  }
}

// POST /api/chat/conversations/[id]/messages
export async function POST(event: RequestEvent) {
  try {
    const { id } = event.params;

    if (!id) {
      return json(
        { error: 'Invalid Request', message: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Check if conversation exists
    const conversation = await getConversation(id);
    if (!conversation) {
      return json({ error: 'Not Found', message: 'Conversation not found' }, { status: 404 });
    }

    const body = await event.request.json();

    if (!body || typeof body !== 'object') {
      return json(
        { error: 'Invalid Request', message: 'Request body must be an object' },
        { status: 400 }
      );
    }

    const { role, content, parts, metadata } = body as {
      role?: string;
      content?: string;
      parts?: unknown;
      metadata?: Record<string, unknown>;
    };

    // Validate required fields
    if (!role || !content) {
      return json(
        { error: 'Invalid Request', message: 'role and content are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['user', 'assistant', 'system', 'tool'];
    if (!validRoles.includes(role)) {
      return json(
        { error: 'Invalid Role', message: `Role must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate content length
    if (content.length === 0) {
      return json(
        { error: 'Invalid Content', message: 'Content cannot be empty' },
        { status: 400 }
      );
    }

    if (content.length > 50000) {
      return json(
        { error: 'Content Too Long', message: 'Content must be 50,000 characters or less' },
        { status: 400 }
      );
    }

    // Create message
    const message = await createMessage({
      conversation_id: id,
      role: role as 'user' | 'assistant' | 'system' | 'tool',
      content,
      parts: parts || null,
      metadata: metadata || {}
    });

    return json({ message }, { status: 201 });
  } catch (error) {
    console.error('Failed to create message:', error);
    return json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to create message'
      },
      { status: 500 }
    );
  }
}
