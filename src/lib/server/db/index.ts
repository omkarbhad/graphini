/**
 * Database Module - Switchable adapter pattern
 *
 * Usage:
 *   import { getDb } from '$lib/server/db';
 *   const db = getDb();
 *   const user = await db.getUserByEmail('test@example.com');
 */

import { DATABASE_URL } from '$env/static/private';
import type { DatabaseAdapter } from './adapter';
import { NeonAdapter } from './neon-adapter';

export type { DatabaseAdapter } from './adapter';
export * from './types';

let dbInstance: DatabaseAdapter | null = null;

/**
 * Get the database adapter singleton.
 * Uses Neon (Drizzle ORM + @neondatabase/serverless).
 */
export function getDb(): DatabaseAdapter {
  if (!dbInstance) {
    if (!DATABASE_URL) {
      throw new Error('Database not configured. Set DATABASE_URL in your environment.');
    }
    dbInstance = new NeonAdapter(DATABASE_URL);
  }
  return dbInstance;
}

/**
 * Reset the DB instance (for testing or hot-swap)
 */
export function resetDb(): void {
  dbInstance = null;
}
