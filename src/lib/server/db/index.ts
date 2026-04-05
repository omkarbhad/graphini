/**
 * Database Module - Switchable adapter pattern
 *
 * Usage:
 *   import { getDb } from '$lib/server/db';
 *   const db = getDb();
 *   const user = await db.getUserByEmail('test@example.com');
 *
 * To switch DB: Change the adapter in this file (e.g. to PrismaAdapter, DrizzleAdapter, etc.)
 */

import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from '$env/static/private';
import type { DatabaseAdapter } from './adapter';
import { SupabaseAdapter } from './supabase-adapter';

export type { DatabaseAdapter } from './adapter';
export * from './types';

let dbInstance: DatabaseAdapter | null = null;

/**
 * Get the database adapter singleton.
 * Currently uses Supabase. To switch:
 * 1. Create a new adapter implementing DatabaseAdapter
 * 2. Replace SupabaseAdapter here
 */
export function getDb(): DatabaseAdapter {
  if (!dbInstance) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }
    dbInstance = new SupabaseAdapter(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return dbInstance;
}

/**
 * Reset the DB instance (for testing or hot-swap)
 */
export function resetDb(): void {
  dbInstance = null;
}
