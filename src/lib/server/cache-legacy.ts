/**
 * Server-side Caching Layer
 * Provides in-memory cache with optional DB persistence and TTL support
 */

import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from '$env/static/private';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  tags: string[];
  createdAt: Date;
  expiresAt: Date | null;
  hitCount: number;
  lastAccessedAt: Date;
}

export interface CacheOptions {
  ttlSeconds?: number;
  tags?: string[];
  persist?: boolean; // Whether to persist to DB
}

export interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  memoryUsage: number;
  hitRate: number;
}

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private stats = { hits: 0, misses: 0 };
  private maxEntries: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(maxEntries = 10000) {
    this.maxEntries = maxEntries;
    this.startCleanup();
  }

  private startCleanup() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000);
  }

  private cleanupExpired() {
    const now = new Date();
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  private evictOldest() {
    if (this.cache.size >= this.maxEntries) {
      // Evict least recently accessed entries
      const entries = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].lastAccessedAt.getTime() - b[1].lastAccessedAt.getTime()
      );

      const toRemove = Math.ceil(this.maxEntries * 0.1); // Remove 10%
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access stats
    entry.hitCount++;
    entry.lastAccessedAt = new Date();
    this.stats.hits++;

    return entry.value as T;
  }

  set<T>(key: string, value: T, options: CacheOptions = {}): void {
    this.evictOldest();

    const now = new Date();
    const entry: CacheEntry<T> = {
      key,
      value,
      tags: options.tags || [],
      createdAt: now,
      expiresAt: options.ttlSeconds ? new Date(now.getTime() + options.ttlSeconds * 1000) : null,
      hitCount: 0,
      lastAccessedAt: now
    };

    this.cache.set(key, entry as CacheEntry);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  deleteByTag(tag: string): number {
    let deleted = 0;
    for (const [key, entry] of this.cache) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      entries: this.cache.size,
      memoryUsage: this.estimateMemoryUsage(),
      hitRate: total > 0 ? this.stats.hits / total : 0
    };
  }

  private estimateMemoryUsage(): number {
    // Rough estimate in bytes
    let size = 0;
    for (const entry of this.cache.values()) {
      size += JSON.stringify(entry.value).length * 2; // UTF-16
    }
    return size;
  }

  getAllEntries(): CacheEntry[] {
    return Array.from(this.cache.values());
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// ============================================================================
// PERSISTENT CACHE (DB-backed)
// ============================================================================

class PersistentCache {
  private supabase: SupabaseClient | null = null;

  private getClient(): SupabaseClient | null {
    if (!this.supabase && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
    }
    return this.supabase;
  }

  async get<T>(key: string): Promise<T | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('cache_entries')
        .select('*')
        .eq('key', key)
        .single();

      if (error || !data) return null;

      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        await this.delete(key);
        return null;
      }

      // Update hit count
      await client
        .from('cache_entries')
        .update({
          hit_count: data.hit_count + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq('key', key);

      return data.value as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    const now = new Date();
    const expiresAt = options.ttlSeconds
      ? new Date(now.getTime() + options.ttlSeconds * 1000).toISOString()
      : null;

    try {
      await client.from('cache_entries').upsert(
        {
          key,
          value,
          tags: options.tags || [],
          created_at: now.toISOString(),
          expires_at: expiresAt,
          hit_count: 0,
          last_accessed_at: now.toISOString()
        },
        { onConflict: 'key' }
      );
    } catch (e) {
      console.error('Failed to persist cache entry:', e);
    }
  }

  async delete(key: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const { error } = await client.from('cache_entries').delete().eq('key', key);
      return !error;
    } catch {
      return false;
    }
  }

  async deleteByTag(tag: string): Promise<number> {
    const client = this.getClient();
    if (!client) return 0;

    try {
      const { data } = await client
        .from('cache_entries')
        .delete()
        .contains('tags', [tag])
        .select('key');
      return data?.length || 0;
    } catch {
      return 0;
    }
  }

  async clear(): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.from('cache_entries').delete().neq('key', '');
    } catch (e) {
      console.error('Failed to clear cache:', e);
    }
  }

  async cleanup(): Promise<number> {
    const client = this.getClient();
    if (!client) return 0;

    try {
      const { data } = await client.rpc('cleanup_expired_cache');
      return data as number;
    } catch {
      return 0;
    }
  }

  async getStats(): Promise<CacheStats> {
    const client = this.getClient();
    if (!client) {
      return { hits: 0, misses: 0, entries: 0, memoryUsage: 0, hitRate: 0 };
    }

    try {
      const { data: entries } = await client.from('cache_entries').select('hit_count, value');

      const totalHits = entries?.reduce((sum, e) => sum + e.hit_count, 0) || 0;
      const entryCount = entries?.length || 0;
      const memoryUsage =
        entries?.reduce((sum, e) => sum + JSON.stringify(e.value).length * 2, 0) || 0;

      return {
        hits: totalHits,
        misses: 0, // Can't track misses in DB cache
        entries: entryCount,
        memoryUsage,
        hitRate: 0 // Need separate tracking
      };
    } catch {
      return { hits: 0, misses: 0, entries: 0, memoryUsage: 0, hitRate: 0 };
    }
  }
}

// ============================================================================
// UNIFIED CACHE SERVICE
// ============================================================================

export class CacheService {
  private memory: MemoryCache;
  private persistent: PersistentCache;
  private defaultTTL: number;

  constructor(options: { maxEntries?: number; defaultTTL?: number } = {}) {
    this.memory = new MemoryCache(options.maxEntries || 10000);
    this.persistent = new PersistentCache();
    this.defaultTTL = options.defaultTTL || 3600; // 1 hour default
  }

  /**
   * Get value from cache (memory first, then DB)
   */
  async get<T>(key: string): Promise<T | null> {
    // Try memory first
    const memValue = this.memory.get<T>(key);
    if (memValue !== null) {
      return memValue;
    }

    // Try persistent cache
    const dbValue = await this.persistent.get<T>(key);
    if (dbValue !== null) {
      // Warm up memory cache
      this.memory.set(key, dbValue, { ttlSeconds: this.defaultTTL });
      return dbValue;
    }

    return null;
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const opts = {
      ...options,
      ttlSeconds: options.ttlSeconds || this.defaultTTL
    };

    // Always set in memory
    this.memory.set(key, value, opts);

    // Persist if requested
    if (options.persist) {
      await this.persistent.set(key, value, opts);
    }
  }

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<boolean> {
    const memResult = this.memory.delete(key);
    const dbResult = await this.persistent.delete(key);
    return memResult || dbResult;
  }

  /**
   * Delete all entries with a specific tag
   */
  async deleteByTag(tag: string): Promise<number> {
    const memDeleted = this.memory.deleteByTag(tag);
    const dbDeleted = await this.persistent.deleteByTag(tag);
    return memDeleted + dbDeleted;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.memory.clear();
    await this.persistent.clear();
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.memory.has(key);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ memory: CacheStats; persistent: CacheStats }> {
    return {
      memory: this.memory.getStats(),
      persistent: await this.persistent.getStats()
    };
  }

  /**
   * Get or set with callback
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<{ memory: number; persistent: number }> {
    const memoryBefore = this.memory.getStats().entries;
    // Memory cleanup happens automatically
    const memoryAfter = this.memory.getStats().entries;
    const persistentDeleted = await this.persistent.cleanup();

    return {
      memory: memoryBefore - memoryAfter,
      persistent: persistentDeleted
    };
  }

  /**
   * Get all cache entries (for admin)
   */
  getAllEntries(): CacheEntry[] {
    return this.memory.getAllEntries();
  }

  destroy() {
    this.memory.destroy();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let cacheInstance: CacheService | null = null;

export function getCache(): CacheService {
  if (!cacheInstance) {
    cacheInstance = new CacheService();
  }
  return cacheInstance;
}

// ============================================================================
// CACHE DECORATORS / HELPERS
// ============================================================================

/**
 * Create a cache key from parts
 */
export function createCacheKey(...parts: (string | number | undefined)[]): string {
  return parts.filter(Boolean).join(':');
}

/**
 * Conversation cache helpers
 */
export const conversationCache = {
  key: (id: string) => createCacheKey('conversation', id),
  messagesKey: (id: string) => createCacheKey('conversation', id, 'messages'),

  async getConversation(id: string) {
    return getCache().get(this.key(id));
  },

  async setConversation(id: string, data: unknown, ttl = 300) {
    await getCache().set(this.key(id), data, {
      ttlSeconds: ttl,
      tags: ['conversation', `conv:${id}`],
      persist: true
    });
  },

  async invalidate(id: string) {
    await getCache().deleteByTag(`conv:${id}`);
  }
};

/**
 * Settings cache helpers
 */
export const settingsCache = {
  key: (userId: string | null, category: string, key: string) =>
    createCacheKey('settings', userId || 'global', category, key),

  async getSetting<T>(userId: string | null, category: string, key: string): Promise<T | null> {
    return getCache().get<T>(this.key(userId, category, key));
  },

  async setSetting<T>(userId: string | null, category: string, key: string, value: T) {
    await getCache().set(this.key(userId, category, key), value, {
      ttlSeconds: 3600,
      tags: ['settings', `settings:${userId || 'global'}`],
      persist: true
    });
  },

  async invalidateUser(userId: string | null) {
    await getCache().deleteByTag(`settings:${userId || 'global'}`);
  }
};
