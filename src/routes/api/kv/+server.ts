/**
 * KV Store API — Supabase-backed key-value storage (replaces localStorage)
 *
 * GET  /api/kv?category=xxx&key=yyy        → get single value
 * GET  /api/kv?category=xxx                 → get all in category
 * GET  /api/kv                              → get all for user
 * POST /api/kv  { category, key, value }    → set single value
 * POST /api/kv  { batch: [{category,key,value}] } → set multiple
 * DELETE /api/kv?category=xxx&key=yyy       → delete single value
 */

import { extractToken, validateSession } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

async function getUserId(request: Request): Promise<string> {
  const token = extractToken(request);
  if (!token) throw error(401, 'Not authenticated');
  const session = await validateSession(token);
  if (!session?.user?.id) throw error(401, 'Not authenticated');
  return session.user.id;
}

export const GET: RequestHandler = async ({ request, url }) => {
  try {
    const userId = await getUserId(request);
    const db = getDb();
    const category = url.searchParams.get('category') || undefined;
    const key = url.searchParams.get('key') || undefined;

    if (category && key) {
      const value = await db.kvGet(userId, category, key);
      return json({ value });
    }

    const entries = await db.kvGetAll(userId, category);
    return json({ entries });
  } catch (e: any) {
    if (e?.status === 401) throw e;
    console.error('[KV GET] Error:', e?.message || e);
    return json({ entries: [], value: null, error: 'KV read failed' }, { status: 200 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const userId = await getUserId(request);
    const db = getDb();
    const body = await request.json();

    if (body.batch && Array.isArray(body.batch)) {
      await db.kvSetBatch(userId, body.batch);
      return json({ ok: true, count: body.batch.length });
    }

    const { category, key, value } = body;
    if (!category || !key) throw error(400, 'category and key required');
    await db.kvSet(userId, category, key, value);
    return json({ ok: true });
  } catch (e: any) {
    if (e?.status === 401 || e?.status === 400) throw e;
    console.error('[KV POST] Error:', e?.message || e);
    return json({ ok: false, error: 'KV write failed' }, { status: 200 });
  }
};

export const DELETE: RequestHandler = async ({ request, url }) => {
  try {
    const userId = await getUserId(request);
    const db = getDb();
    const category = url.searchParams.get('category');
    const key = url.searchParams.get('key');
    if (!category || !key) throw error(400, 'category and key required');
    await db.kvDelete(userId, category, key);
    return json({ ok: true });
  } catch (e: any) {
    if (e?.status === 401 || e?.status === 400) throw e;
    console.error('[KV DELETE] Error:', e?.message || e);
    return json({ ok: false, error: 'KV delete failed' }, { status: 200 });
  }
};
