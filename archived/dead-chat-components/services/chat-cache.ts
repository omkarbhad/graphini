/**
 * Chat Cache Service
 * Provides fast local caching for chat conversations with IndexedDB
 * Falls back to localStorage for browsers without IndexedDB support
 */

// UIMessage interface matching the one used in Chat.svelte
export interface UIMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  parts?: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>;
  timestamp?: Date;
  [key: string]: unknown;
}

interface CachedConversation {
  id: string;
  title: string;
  messages: UIMessage[];
  lastUpdated: number;
  synced: boolean;
}

interface CacheMetadata {
  version: number;
  lastCleanup: number;
}

const CACHE_VERSION = 1;
const CACHE_PREFIX = 'chat_cache_';
const METADATA_KEY = 'chat_cache_metadata';
const MAX_CACHED_CONVERSATIONS = 50;
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

class ChatCacheService {
  private dbName = 'graphini_chat_cache';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private useIndexedDB = true;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    try {
      if (typeof indexedDB === 'undefined') {
        this.useIndexedDB = false;
        this.initialized = true;
        return;
      }

      this.db = await this.openDatabase();
      this.initialized = true;

      // Run cleanup in background
      this.cleanup().catch(console.warn);
    } catch (error) {
      console.warn('IndexedDB not available, falling back to localStorage:', error);
      this.useIndexedDB = false;
      this.initialized = true;
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const store = db.createObjectStore('conversations', { keyPath: 'id' });
          store.createIndex('lastUpdated', 'lastUpdated', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  async getConversation(id: string): Promise<CachedConversation | null> {
    await this.init();

    if (this.useIndexedDB && this.db) {
      return this.getFromIndexedDB(id);
    }
    return this.getFromLocalStorage(id);
  }

  async saveConversation(conversation: CachedConversation): Promise<void> {
    await this.init();

    conversation.lastUpdated = Date.now();

    if (this.useIndexedDB && this.db) {
      await this.saveToIndexedDB(conversation);
    } else {
      this.saveToLocalStorage(conversation);
    }
  }

  async updateMessages(id: string, messages: UIMessage[], synced = false): Promise<void> {
    await this.init();

    const existing = await this.getConversation(id);
    if (existing) {
      existing.messages = messages;
      existing.synced = synced;
      existing.lastUpdated = Date.now();
      await this.saveConversation(existing);
    } else {
      await this.saveConversation({
        id,
        title: 'Chat',
        messages,
        lastUpdated: Date.now(),
        synced
      });
    }
  }

  async markSynced(id: string): Promise<void> {
    const conversation = await this.getConversation(id);
    if (conversation) {
      conversation.synced = true;
      await this.saveConversation(conversation);
    }
  }

  async deleteConversation(id: string): Promise<void> {
    await this.init();

    if (this.useIndexedDB && this.db) {
      await this.deleteFromIndexedDB(id);
    } else {
      this.deleteFromLocalStorage(id);
    }
  }

  async listConversations(): Promise<CachedConversation[]> {
    await this.init();

    if (this.useIndexedDB && this.db) {
      return this.listFromIndexedDB();
    }
    return this.listFromLocalStorage();
  }

  async getUnsyncedConversations(): Promise<CachedConversation[]> {
    const all = await this.listConversations();
    return all.filter((c) => !c.synced);
  }

  private async cleanup(): Promise<void> {
    const conversations = await this.listConversations();
    const now = Date.now();

    // Remove expired conversations
    const expired = conversations.filter((c) => now - c.lastUpdated > CACHE_EXPIRY_MS);
    for (const conv of expired) {
      await this.deleteConversation(conv.id);
    }

    // If still too many, remove oldest
    const remaining = conversations.filter((c) => now - c.lastUpdated <= CACHE_EXPIRY_MS);
    if (remaining.length > MAX_CACHED_CONVERSATIONS) {
      const sorted = remaining.sort((a, b) => a.lastUpdated - b.lastUpdated);
      const toRemove = sorted.slice(0, remaining.length - MAX_CACHED_CONVERSATIONS);
      for (const conv of toRemove) {
        await this.deleteConversation(conv.id);
      }
    }
  }

  // IndexedDB methods
  private getFromIndexedDB(id: string): Promise<CachedConversation | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      const transaction = this.db.transaction(['conversations'], 'readonly');
      const store = transaction.objectStore('conversations');
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  private saveToIndexedDB(conversation: CachedConversation): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      // Deep clone to remove Svelte reactive proxies that can't be stored in IndexedDB
      const cloneableConversation = JSON.parse(JSON.stringify(conversation));

      const transaction = this.db.transaction(['conversations'], 'readwrite');
      const store = transaction.objectStore('conversations');
      const request = store.put(cloneableConversation);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private deleteFromIndexedDB(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      const transaction = this.db.transaction(['conversations'], 'readwrite');
      const store = transaction.objectStore('conversations');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private listFromIndexedDB(): Promise<CachedConversation[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const transaction = this.db.transaction(['conversations'], 'readonly');
      const store = transaction.objectStore('conversations');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  // LocalStorage fallback methods
  private getFromLocalStorage(id: string): CachedConversation | null {
    try {
      const data = localStorage.getItem(`${CACHE_PREFIX}${id}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private saveToLocalStorage(conversation: CachedConversation): void {
    try {
      localStorage.setItem(`${CACHE_PREFIX}${conversation.id}`, JSON.stringify(conversation));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
      // Try to free up space
      this.cleanupLocalStorage();
    }
  }

  private deleteFromLocalStorage(id: string): void {
    localStorage.removeItem(`${CACHE_PREFIX}${id}`);
  }

  private listFromLocalStorage(): CachedConversation[] {
    const conversations: CachedConversation[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            conversations.push(JSON.parse(data));
          }
        } catch {
          // Skip invalid entries
        }
      }
    }
    return conversations;
  }

  private cleanupLocalStorage(): void {
    const conversations = this.listFromLocalStorage();
    const sorted = conversations.sort((a, b) => a.lastUpdated - b.lastUpdated);

    // Remove oldest half
    const toRemove = sorted.slice(0, Math.floor(sorted.length / 2));
    for (const conv of toRemove) {
      this.deleteFromLocalStorage(conv.id);
    }
  }
}

// Singleton instance
export const chatCache = new ChatCacheService();

// Helper functions for common operations
export async function getCachedMessages(conversationId: string): Promise<UIMessage[] | null> {
  const conversation = await chatCache.getConversation(conversationId);
  return conversation?.messages || null;
}

export async function cacheMessages(
  conversationId: string,
  messages: UIMessage[],
  title?: string,
  synced = false
): Promise<void> {
  await chatCache.saveConversation({
    id: conversationId,
    title: title || 'Chat',
    messages,
    lastUpdated: Date.now(),
    synced
  });
}

export async function clearConversationCache(conversationId: string): Promise<void> {
  await chatCache.deleteConversation(conversationId);
}
