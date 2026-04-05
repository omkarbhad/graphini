import { deleteUserMemory, updateUserMemory } from '$lib/server/db';
import { json, type RequestHandler } from '@sveltejs/kit';

function isMissingTableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  return msg.includes("Could not find the table 'public.user_memories'");
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const PATCH: RequestHandler = async ({ params, request }) => {
  const id = params.id;
  if (!id || !isUuid(id)) {
    return json({ error: 'Invalid Request', message: 'id must be a UUID' }, { status: 400 });
  }

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

  const { content, importance, expires_at, metadata } = body as Record<string, unknown>;

  try {
    const updated = await updateUserMemory(id, {
      content: typeof content === 'string' ? content : undefined,
      importance: typeof importance === 'number' ? importance : undefined,
      expires_at:
        typeof expires_at === 'string' || expires_at === null
          ? (expires_at as string | null)
          : undefined,
      metadata:
        typeof metadata === 'object' && metadata !== null
          ? (metadata as Record<string, unknown>)
          : undefined
    });
    return json({ memory: updated });
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

export const DELETE: RequestHandler = async ({ params }) => {
  const id = params.id;
  if (!id || !isUuid(id)) {
    return json({ error: 'Invalid Request', message: 'id must be a UUID' }, { status: 400 });
  }

  try {
    await deleteUserMemory(id);
    return new Response(null, { status: 204 });
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
