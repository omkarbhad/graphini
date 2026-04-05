/**
 * Persistent Store System
 * Client-side stores with localStorage persistence and server sync
 */

import { browser } from '$app/environment';
import { kvDelete, kvGet, kvSet } from '$lib/stores/kvStore';
import { derived, get, writable, type Readable, type Writable } from 'svelte/store';

// ============================================================================
// TYPES
// ============================================================================

export interface StoreOptions<T> {
  key: string;
  defaultValue: T;
  persist?: boolean;
  sync?: boolean;
  syncInterval?: number;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
  validate?: (value: unknown) => value is T;
}

export interface SyncStatus {
  lastSynced: Date | null;
  syncing: boolean;
  error: string | null;
}

export interface PersistentStore<T> extends Writable<T> {
  reset: () => void;
  sync: () => Promise<void>;
  getSyncStatus: () => SyncStatus;
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

const STORAGE_PREFIX = 'mermaid_';

function getStorageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

function getFromStorage<T>(key: string, defaultValue: T, _deserialize?: (value: string) => T): T {
  if (!browser) return defaultValue;

  try {
    const stored = kvGet<T>('settings', getStorageKey(key));
    if (stored === null || stored === undefined) return defaultValue;
    return stored;
  } catch {
    return defaultValue;
  }
}

function setToStorage<T>(key: string, value: T, _serialize?: (value: T) => string): void {
  if (!browser) return;

  try {
    kvSet('settings', getStorageKey(key), value);
  } catch (e) {
    console.error(`Failed to persist ${key}:`, e);
  }
}

function removeFromStorage(key: string): void {
  if (!browser) return;
  kvDelete('settings', getStorageKey(key));
}

// ============================================================================
// PERSISTENT STORE FACTORY
// ============================================================================

export function createPersistentStore<T>(options: StoreOptions<T>): PersistentStore<T> {
  const {
    key,
    defaultValue,
    persist = true,
    sync = false,
    syncInterval = 30000,
    serialize,
    deserialize,
    validate
  } = options;

  // Initialize with stored value or default
  const initialValue = persist ? getFromStorage(key, defaultValue, deserialize) : defaultValue;

  // Validate if validator provided
  const validatedValue = validate && !validate(initialValue) ? defaultValue : initialValue;

  const store = writable<T>(validatedValue);

  // Sync status
  let syncStatus: SyncStatus = {
    lastSynced: null,
    syncing: false,
    error: null
  };

  let syncIntervalId: ReturnType<typeof setInterval> | null = null;

  // Subscribe to persist changes
  if (persist) {
    store.subscribe((value) => {
      setToStorage(key, value, serialize);
    });
  }

  // Sync function
  async function syncToServer(): Promise<void> {
    if (!sync || !browser) return;

    syncStatus.syncing = true;
    syncStatus.error = null;

    try {
      let currentValue: T = undefined as unknown as T;
      store.subscribe((v) => (currentValue = v))();

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveState',
          stateType: 'ui',
          stateData: { [key]: currentValue },
          sessionId: getSessionId()
        })
      });

      if (!res.ok) throw new Error('Sync failed');

      syncStatus.lastSynced = new Date();
    } catch (e) {
      syncStatus.error = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      syncStatus.syncing = false;
    }
  }

  // Start sync interval
  if (sync && browser) {
    syncIntervalId = setInterval(syncToServer, syncInterval);
  }

  return {
    subscribe: store.subscribe,
    set: (value: T) => {
      store.set(value);
    },
    update: (updater: (value: T) => T) => {
      store.update(updater);
    },
    reset: () => {
      store.set(defaultValue);
      if (persist) {
        removeFromStorage(key);
      }
    },
    sync: syncToServer,
    getSyncStatus: () => ({ ...syncStatus })
  };
}

// ============================================================================
// SESSION HELPERS
// ============================================================================

function getSessionId(): string {
  if (!browser) return 'server';

  let sessionId = kvGet<string>('session', 'session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    kvSet('session', 'session_id', sessionId);
  }
  return sessionId;
}

export function getUserId(): string | null {
  if (!browser) return null;
  return kvGet<string>('settings', `${STORAGE_PREFIX}user_id`);
}

export function setUserId(userId: string): void {
  if (!browser) return;
  kvSet('settings', `${STORAGE_PREFIX}user_id`, userId);
}

// ============================================================================
// PRE-BUILT STORES
// ============================================================================

// UI Settings Store
export interface UISettings {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  showReasoning: boolean;
  autoScroll: boolean;
  compactMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

export const uiSettingsStore = createPersistentStore<UISettings>({
  key: 'ui_settings',
  defaultValue: {
    theme: 'system',
    sidebarOpen: true,
    showReasoning: true,
    autoScroll: true,
    compactMode: false,
    fontSize: 'medium'
  },
  persist: true
});

// AI Settings Store
export interface AISettings {
  provider: 'openai' | 'anthropic' | 'openrouter' | 'kilo' | 'gemini';
  model: string;
  providerModel?: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
  promptMode: 'simple' | 'advanced' | 'visual';
  streamResponse: boolean;
  favoriteModels: string[];
  // API Keys
  openaiApiKey?: string;
  anthropicApiKey?: string;
  openrouterApiKey?: string;
  kiloApiKey?: string;
  geminiApiKey?: string;
}

export const aiSettingsStore = createPersistentStore<AISettings>({
  key: 'ai_settings',
  defaultValue: {
    provider: 'openai',
    model: 'gpt-4o',
    providerModel: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4000,
    promptMode: 'simple',
    streamResponse: true,
    favoriteModels: ['gpt-4o', 'anthropic/claude-3.5-sonnet', 'gemini-3-flash-preview'], // Updated to use Gemini 3 Flash Preview
    // API Keys (empty by default)
    openaiApiKey: '',
    anthropicApiKey: '',
    openrouterApiKey: '',
    kiloApiKey: '',
    geminiApiKey: ''
  },
  persist: true
});

// Editor Settings Store
export interface EditorSettings {
  autoFormat: boolean;
  lineNumbers: boolean;
  wordWrap: boolean;
  minimap: boolean;
  tabSize: number;
  autoSave: boolean;
  autoSaveDelay: number;
}

export const editorSettingsStore = createPersistentStore<EditorSettings>({
  key: 'editor_settings',
  defaultValue: {
    autoFormat: true,
    lineNumbers: true,
    wordWrap: true,
    minimap: false,
    tabSize: 2,
    autoSave: true,
    autoSaveDelay: 1000
  },
  persist: true
});

// Recent Conversations Store
export interface RecentConversation {
  id: string;
  title: string;
  updatedAt: Date;
  messageCount: number;
}

export const recentConversationsStore = createPersistentStore<RecentConversation[]>({
  key: 'recent_conversations',
  defaultValue: [],
  persist: true,
  serialize: (value) =>
    JSON.stringify(
      value.map((c) => ({
        ...c,
        updatedAt: c.updatedAt.toISOString()
      }))
    ),
  deserialize: (value) =>
    JSON.parse(value).map((c: any) => ({
      ...c,
      updatedAt: new Date(c.updatedAt)
    }))
});

// Favorites Store
export const favoritesStore = createPersistentStore<string[]>({
  key: 'favorites',
  defaultValue: [],
  persist: true
});

// Draft Messages Store (for unsent messages)
export const draftMessagesStore = createPersistentStore<Record<string, string>>({
  key: 'draft_messages',
  defaultValue: {},
  persist: true
});

// ============================================================================
// DERIVED STORES
// ============================================================================

// Combined settings
export const allSettings: Readable<{
  ui: UISettings;
  ai: AISettings;
  editor: EditorSettings;
}> = derived([uiSettingsStore, aiSettingsStore, editorSettingsStore], ([$ui, $ai, $editor]) => ({
  ui: $ui,
  ai: $ai,
  editor: $editor
}));

// Is dark mode
export const isDarkMode: Readable<boolean> = derived(uiSettingsStore, ($settings) => {
  if ($settings.theme === 'system') {
    if (!browser) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return $settings.theme === 'dark';
});

// ============================================================================
// STORE ACTIONS
// ============================================================================

export const storeActions = {
  // UI Actions
  toggleTheme: () => {
    uiSettingsStore.update((s) => ({
      ...s,
      theme: s.theme === 'dark' ? 'light' : 'dark'
    }));
  },

  toggleSidebar: () => {
    uiSettingsStore.update((s) => ({ ...s, sidebarOpen: !s.sidebarOpen }));
  },

  toggleReasoning: () => {
    uiSettingsStore.update((s) => ({ ...s, showReasoning: !s.showReasoning }));
  },

  // AI Actions
  setModel: (model: string) => {
    aiSettingsStore.update((s) => ({ ...s, model }));
  },

  setTemperature: (temperature: number) => {
    aiSettingsStore.update((s) => ({ ...s, temperature }));
  },

  // AI Model Favorites
  toggleFavoriteModel: (modelId: string) => {
    aiSettingsStore.update((s) => {
      const favorites = s.favoriteModels || [];
      if (favorites.includes(modelId)) {
        return { ...s, favoriteModels: favorites.filter((f) => f !== modelId) };
      }
      return { ...s, favoriteModels: [...favorites, modelId] };
    });
  },

  isFavoriteModel: (modelId: string) => {
    // Get current value without subscription to avoid reactivity issues
    const currentState = get(aiSettingsStore);
    return (currentState.favoriteModels || []).includes(modelId);
  },

  getFavoriteModels: () => {
    // Get current value without subscription to avoid reactivity issues
    const currentState = get(aiSettingsStore);
    return currentState.favoriteModels || [];
  },

  // Recent Conversations
  addRecentConversation: (conv: RecentConversation) => {
    recentConversationsStore.update((list) => {
      const filtered = list.filter((c) => c.id !== conv.id);
      return [conv, ...filtered].slice(0, 20); // Keep last 20
    });
  },

  removeRecentConversation: (id: string) => {
    recentConversationsStore.update((list) => list.filter((c) => c.id !== id));
  },

  // Favorites
  toggleFavorite: (id: string) => {
    favoritesStore.update((list) => {
      if (list.includes(id)) {
        return list.filter((f) => f !== id);
      }
      return [...list, id];
    });
  },

  // Drafts
  saveDraft: (conversationId: string, content: string) => {
    draftMessagesStore.update((drafts) => ({
      ...drafts,
      [conversationId]: content
    }));
  },

  clearDraft: (conversationId: string) => {
    draftMessagesStore.update((drafts) => {
      const { [conversationId]: _, ...rest } = drafts;
      return rest;
    });
  },

  // Reset all
  resetAllSettings: () => {
    uiSettingsStore.reset();
    aiSettingsStore.reset();
    editorSettingsStore.reset();
  }
};

// ============================================================================
// SYNC ALL STORES
// ============================================================================

export async function syncAllStores(): Promise<void> {
  await Promise.all([uiSettingsStore.sync(), aiSettingsStore.sync()]);
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export { getFromStorage, getSessionId, getStorageKey, removeFromStorage, setToStorage };
