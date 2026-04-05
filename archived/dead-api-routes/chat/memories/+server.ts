import {
  createUserMemory,
  getUserMemories,
  type MemorySource,
  type MemoryType
} from '$lib/server/db';
import { json, type RequestHandler } from '@sveltejs/kit';

function isMissingTableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  return msg.includes("Could not find the table 'public.user_memories'");
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const GET: RequestHandler = async ({ url }) => {
  const userId = url.searchParams.get('userId') ?? url.searchParams.get('user_id');
  if (!userId || typeof userId !== 'string') {
    return json({ error: 'Invalid Request', message: 'userId is required' }, { status: 400 });
  }

  const limitRaw = url.searchParams.get('limit');
  const limit = limitRaw ? Math.max(1, Math.min(50, Number(limitRaw) || 20)) : 20;

  try {
    const memories = await getUserMemories(userId, { limit });
    return json({ memories });
  } catch (error) {
    if (isMissingTableError(error)) {
      return json(
        {
          error: 'Memory Storage Not Initialized',
          message:
            'The user_memories table is missing. Run database/add-user-memories.sql in Supabase.'
        },
        { status: 503 }
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: 'Internal Server Error', message }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(
      { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object') {
    return json(
      { error: 'Invalid Request', message: 'Request body must be an object' },
      { status: 400 }
    );
  }

  const {
    user_id,
    userId,
    memory_type,
    memoryType,
    content,
    importance,
    source,
    expires_at,
    metadata
  } = body as Record<string, unknown>;

  const resolvedUserId = (user_id ?? userId) as string | undefined;
  const resolvedMemoryType = (memory_type ?? memoryType) as MemoryType | undefined;

  if (!resolvedUserId || typeof resolvedUserId !== 'string') {
    return json(
      { error: 'Invalid Request', message: 'user_id (or userId) is required' },
      { status: 400 }
    );
  }

  // If userId is a UUID we validate, otherwise allow non-uuid (e.g., local ids) for flexibility.
  if (resolvedUserId.includes('-') && !isUuid(resolvedUserId)) {
    return json({ error: 'Invalid Request', message: 'user_id must be a UUID' }, { status: 400 });
  }

  if (!resolvedMemoryType || typeof resolvedMemoryType !== 'string') {
    return json({ error: 'Invalid Request', message: 'memory_type is required' }, { status: 400 });
  }

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return json({ error: 'Invalid Request', message: 'content is required' }, { status: 400 });
  }

  try {
    const created = await createUserMemory({
      content: content.trim(),
      expires_at: typeof expires_at === 'string' ? expires_at : null,
      importance: typeof importance === 'number' ? importance : undefined,
      memory_type: resolvedMemoryType,
      metadata:
        typeof metadata === 'object' && metadata !== null
          ? (metadata as Record<string, unknown>)
          : {},
      source: typeof source === 'string' ? (source as MemorySource) : undefined,
      user_id: resolvedUserId
    });

    return json({ memory: created }, { status: 201 });
  } catch (error) {
    if (isMissingTableError(error)) {
      return json(
        {
          error: 'Memory Storage Not Initialized',
          message:
            'The user_memories table is missing. Run database/add-user-memories.sql in Supabase.'
        },
        { status: 503 }
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: 'Internal Server Error', message }, { status: 500 });
  }
};
