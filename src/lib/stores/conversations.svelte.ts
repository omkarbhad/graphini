/**
 * Client-side Conversations Store
 * Manages conversation list, active conversation, and CRUD operations
 */

import { hmrRestore, hmrPreserve } from '$lib/util/hmr';

interface ConversationItem {
  id: string;
  title: string | null;
  is_pinned: boolean;
  is_archived: boolean;
  updated_at: string;
  created_at: string;
}

interface ConversationsState {
  list: ConversationItem[];
  activeId: string | null;
  loading: boolean;
  sidebarOpen: boolean;
}

const state = $state<ConversationsState>(
  hmrRestore('conversationsState') ?? {
    list: [],
    activeId: null,
    loading: false,
    sidebarOpen: false
  }
);
hmrPreserve('conversationsState', () => ({ ...state }));

async function fetchConversations(): Promise<void> {
  try {
    state.loading = true;
    const res = await fetch('/api/conversations', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      state.list = data.conversations || [];
    }
  } catch {
    /* ignore */
  } finally {
    state.loading = false;
  }
}

async function createConversation(title?: string): Promise<ConversationItem | null> {
  try {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title || 'New Chat' }),
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      const conv = data.conversation;
      state.list = [conv, ...state.list];
      state.activeId = conv.id;
      return conv;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function deleteConversation(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/conversations?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (res.ok) {
      state.list = state.list.filter((c) => c.id !== id);
      if (state.activeId === id) {
        state.activeId = state.list[0]?.id ?? null;
      }
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function setActive(id: string | null): void {
  state.activeId = id;
}

function toggleSidebar(): void {
  state.sidebarOpen = !state.sidebarOpen;
}

function openSidebar(): void {
  state.sidebarOpen = true;
}

function closeSidebar(): void {
  state.sidebarOpen = false;
}

export const conversationsStore = {
  get activeId() {
    return state.activeId;
  },
  closeSidebar,
  create: createConversation,
  delete: deleteConversation,
  fetch: fetchConversations,
  get isLoading() {
    return state.loading;
  },
  get isSidebarOpen() {
    return state.sidebarOpen;
  },
  get list() {
    return state.list;
  },
  openSidebar,
  setActive,
  get state() {
    return state;
  },
  toggleSidebar
};
