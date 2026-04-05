/**
 * Conversations API Endpoint
 * GET  /api/chat/conversations - List all conversations
 * POST /api/chat/conversations - Create new conversation
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import { createConversation, listConversations, type Conversation } from '$lib/server/db';

// GET /api/chat/conversations
export async function GET(event: RequestEvent) {
  try {
    const url = new URL(event.request.url);
    const userId = url.searchParams.get('user_id');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      return json(
        { error: 'Invalid limit', message: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    if (offset < 0) {
      return json(
        { error: 'Invalid offset', message: 'Offset must be non-negative' },
        { status: 400 }
      );
    }

    const conversations = await listConversations({
      user_id: userId || undefined,
      limit,
      offset
    });

    return json({
      conversations,
      pagination: {
        limit,
        offset,
        total: conversations.length
      }
    });
  } catch (error) {
    console.error('Failed to list conversations:', error);
    return json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to list conversations'
      },
      { status: 500 }
    );
  }
}

// POST /api/chat/conversations
export async function POST(event: RequestEvent) {
  try {
    const body = await event.request.json();

    // Validate request body
    if (!body || typeof body !== 'object') {
      return json(
        { error: 'Invalid Request', message: 'Request body must be an object' },
        { status: 400 }
      );
    }

    const { user_id, title, metadata } = body as {
      user_id?: string;
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

    // Create conversation
    const conversation = await createConversation({
      user_id: user_id || null,
      title: title || null,
      metadata: metadata || {}
    });

    return json({ conversation }, { status: 201 });
  } catch (error) {
    console.error('Failed to create conversation:', error);
    return json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to create conversation'
      },
      { status: 500 }
    );
  }
}
