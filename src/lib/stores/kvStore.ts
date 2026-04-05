/**
 * Client-side KV Store — Supabase-backed via /api/kv
 * Replaces ALL localStorage usage. Uses in-memory cache for fast reads
 * and async writes to server.
 */

// In-memory cache keyed by "category::key"
const memCache = new Map<string, unknown>();
let initialized = false;
let isAuthenticated = false;
let initPromise: Promise<void> | null = null;
const pendingWrites = new Map<string, { category: string; key: string; value: unknown }>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let _lastSavedAt: number | null = null;
let _syncListeners: Array<() => void> = [];

function notifySyncListeners() {
  for (const fn of _syncListeners) fn();
}

const LS_PREFIX = 'kv::';

function lsGet(ck: string): unknown | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(LS_PREFIX + ck);
    return raw !== null ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function lsSet(ck: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LS_PREFIX + ck, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

function lsDel(ck: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(LS_PREFIX + ck);
  } catch {
    /* ignore */
  }
}

function lsLoadAll(): void {
  if (typeof localStorage === 'undefined') return;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(LS_PREFIX)) {
      try {
        const ck = k.slice(LS_PREFIX.length);
        if (!memCache.has(ck)) {
          memCache.set(ck, JSON.parse(localStorage.getItem(k)!));
        }
      } catch {
        /* ignore */
      }
    }
  }
}

function cacheKey(category: string, key: string): string {
  return `${category}::${key}`;
}

/**
 * Initialize the KV store by loading all user settings from server.
 * Call once on app mount when user is authenticated.
 */
export async function kvInit(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    // Always load localStorage first for instant availability
    lsLoadAll();
    try {
      const res = await fetch('/api/kv', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const entries = data.entries || [];
        for (const e of entries) {
          const ck = cacheKey(e.category, e.key);
          memCache.set(ck, e.value);
          // Mirror server data to localStorage
          lsSet(ck, e.value);
        }
        isAuthenticated = true;
      } else {
        isAuthenticated = false;
      }
      initialized = true;
    } catch {
      // Silently fail — localStorage data is already loaded
      initialized = true;
    }
  })();
  return initPromise;
}

/**
 * Get a value from the KV store (sync from memory cache).
 */
export function kvGet<T = unknown>(category: string, key: string): T | null {
  const v = memCache.get(cacheKey(category, key));
  return v !== undefined ? (v as T) : null;
}

/**
 * Set a value in the KV store (immediate in-memory, debounced server write).
 */
export function kvSet(category: string, key: string, value: unknown): void {
  const ck = cacheKey(category, key);
  memCache.set(ck, value);
  lsSet(ck, value);
  pendingWrites.set(ck, { category, key, value });
  scheduleFlush();
}

/**
 * Delete a value from the KV store.
 */
export function kvDelete(category: string, key: string): void {
  const ck = cacheKey(category, key);
  memCache.delete(ck);
  lsDel(ck);
  pendingWrites.delete(ck);
  if (!isAuthenticated) return;
  fetch(`/api/kv?category=${encodeURIComponent(category)}&key=${encodeURIComponent(key)}`, {
    method: 'DELETE',
    credentials: 'include',
    keepalive: true
  }).catch(() => {});
}

/**
 * Get all entries for a category.
 */
export function kvGetCategory<T = unknown>(category: string): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [k, v] of memCache.entries()) {
    if (k.startsWith(category + '::')) {
      const key = k.slice(category.length + 2);
      result[key] = v as T;
    }
  }
  return result;
}

/**
 * Flush all pending writes to server immediately.
 */
export async function kvFlush(): Promise<void> {
  if (pendingWrites.size === 0) return;
  if (!isAuthenticated) {
    pendingWrites.clear();
    return;
  }
  const batch = Array.from(pendingWrites.values());
  pendingWrites.clear();
  try {
    await fetch('/api/kv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify({ batch })
    });
    _lastSavedAt = Date.now();
    notifySyncListeners();
  } catch {
    // Re-queue on failure
    for (const entry of batch) {
      pendingWrites.set(cacheKey(entry.category, entry.key), entry);
    }
    notifySyncListeners();
  }
}

function scheduleFlush(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    kvFlush();
  }, 1500);
}

/**
 * Force flush on page unload.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (pendingWrites.size > 0 && isAuthenticated) {
      const batch = Array.from(pendingWrites.values());
      pendingWrites.clear();
      navigator.sendBeacon(
        '/api/kv',
        new Blob([JSON.stringify({ batch })], { type: 'application/json' })
      );
    }
  });
}

/**
 * Check if KV store is initialized.
 */
export function kvIsReady(): boolean {
  return initialized;
}

/**
 * Sync status for UI indicator.
 */
export function kvSyncStatus(): { lastSavedAt: number | null; hasPending: boolean } {
  return { lastSavedAt: _lastSavedAt, hasPending: pendingWrites.size > 0 };
}

/**
 * Subscribe to sync status changes.
 */
export function kvOnSyncChange(fn: () => void): () => void {
  _syncListeners.push(fn);
  return () => {
    _syncListeners = _syncListeners.filter((f) => f !== fn);
  };
}

/**
 * Reset the KV store (for logout).
 */
export function kvReset(): void {
  // Clear localStorage kv entries
  if (typeof localStorage !== 'undefined') {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_PREFIX)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  }
  memCache.clear();
  pendingWrites.clear();
  initialized = false;
  isAuthenticated = false;
  initPromise = null;
}

/**
 * Get all entries (for admin/debug).
 */
export function kvGetAll(): { category: string; key: string; value: unknown }[] {
  const result: { category: string; key: string; value: unknown }[] = [];
  for (const [k, v] of memCache.entries()) {
    const [category, ...rest] = k.split('::');
    result.push({ category, key: rest.join('::'), value: v });
  }
  return result;
}
