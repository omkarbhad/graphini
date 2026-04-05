/**
 * Normalized state management for chat application
 * Implements a single source of truth with proper normalization
 */

import { browser } from '$app/environment';
import { derived, writable } from 'svelte/store';

// ==================== Core Types ====================

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  parts?: MessagePart[];
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface MessagePart {
  type: string;
  text?: string;
  toolName?: string;
  result?: unknown;
}

export interface Conversation {
  id: string;
  userId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface ChatState {
  // Normalized entities
  entities: {
    users: Record<string, User>;
    conversations: Record<string, Conversation>;
    messages: Record<string, Message>;
  };

  // UI state
  ui: {
    activeConversationId: string | null;
    loading: boolean;
    error: string | null;
    streaming: boolean;
    expandedMessageIds: Set<string>;
    selectedModelId: string;
    promptMode: 'plan' | 'create';
  };

  // Pagination/cursors
  pagination: {
    conversations: {
      cursor: string | null;
      hasMore: boolean;
      loading: boolean;
    };
    messages: {
      [conversationId: string]: {
        cursor: string | null;
        hasMore: boolean;
        loading: boolean;
      };
    };
  };
}

// ==================== Initial State ====================

const initialState: ChatState = {
  entities: {
    users: {},
    conversations: {},
    messages: {}
  },
  ui: {
    activeConversationId: null,
    loading: false,
    error: null,
    streaming: false,
    expandedMessageIds: new Set(),
    selectedModelId: 'gpt-5-mini',
    promptMode: 'create'
  },
  pagination: {
    conversations: {
      cursor: null,
      hasMore: true,
      loading: false
    },
    messages: {}
  }
};

// ==================== Store Creation ====================

function createChatStore() {
  const { subscribe, set, update } = writable<ChatState>(initialState);

  // Persistence keys
  const STATE_STORAGE_KEY = 'mermaid_chat_state';
  const UI_STATE_STORAGE_KEY = 'mermaid_chat_ui_state';

  // Load persisted state
  function loadPersistedState(): Partial<ChatState> {
    if (!browser) return {};

    try {
      const uiState = localStorage.getItem(UI_STATE_STORAGE_KEY);
      return uiState ? { ui: { ...initialState.ui, ...JSON.parse(uiState) } } : {};
    } catch (error) {
      console.warn('Failed to load persisted state:', error);
      return {};
    }
  }

  // Save UI state to localStorage
  function persistUIState(state: ChatState): void {
    if (!browser) return;

    try {
      const uiStateToPersist = {
        activeConversationId: state.ui.activeConversationId,
        selectedModelId: state.ui.selectedModelId,
        promptMode: state.ui.promptMode
      };
      localStorage.setItem(UI_STATE_STORAGE_KEY, JSON.stringify(uiStateToPersist));
    } catch (error) {
      console.warn('Failed to persist UI state:', error);
    }
  }

  // ==================== Entity Actions ====================

  const entities = {
    // User actions
    addUser: (user: User) =>
      update((state) => ({
        ...state,
        entities: {
          ...state.entities,
          users: {
            ...state.entities.users,
            [user.id]: user
          }
        }
      })),

    // Conversation actions
    addConversation: (conversation: Conversation) =>
      update((state) => ({
        ...state,
        entities: {
          ...state.entities,
          conversations: {
            ...state.entities.conversations,
            [conversation.id]: conversation
          }
        }
      })),

    updateConversation: (id: string, updates: Partial<Conversation>) =>
      update((state) => {
        const existingConversation = state.entities.conversations[id];
        if (!existingConversation) return state;

        return {
          ...state,
          entities: {
            ...state.entities,
            conversations: {
              ...state.entities.conversations,
              [id]: { ...existingConversation, ...updates }
            }
          }
        };
      }),

    removeConversation: (id: string) =>
      update((state) => {
        const newConversations = { ...state.entities.conversations };
        delete newConversations[id];

        // Also remove associated messages
        const newMessages = { ...state.entities.messages };
        Object.values(newMessages).forEach((message) => {
          if (message.conversationId === id) {
            delete newMessages[message.id];
          }
        });

        return {
          ...state,
          entities: {
            ...state.entities,
            conversations: newConversations,
            messages: newMessages
          }
        };
      }),

    // Message actions
    addMessage: (message: Message) =>
      update((state) => ({
        ...state,
        entities: {
          ...state.entities,
          messages: {
            ...state.entities.messages,
            [message.id]: message
          }
        }
      })),

    updateMessage: (id: string, updates: Partial<Message>) =>
      update((state) => {
        const existingMessage = state.entities.messages[id];
        if (!existingMessage) return state;

        return {
          ...state,
          entities: {
            ...state.entities,
            messages: {
              ...state.entities.messages,
              [id]: { ...existingMessage, ...updates }
            }
          }
        };
      }),

    removeMessage: (id: string) =>
      update((state) => {
        const newMessages = { ...state.entities.messages };
        delete newMessages[id];
        return {
          ...state,
          entities: {
            ...state.entities,
            messages: newMessages
          }
        };
      })
  };

  // ==================== UI Actions ====================

  const ui = {
    setActiveConversation: (conversationId: string | null) =>
      update((state) => {
        const newState = {
          ...state,
          ui: {
            ...state.ui,
            activeConversationId: conversationId
          }
        };
        persistUIState(newState);
        return newState;
      }),

    setLoading: (loading: boolean) =>
      update((state) => ({
        ...state,
        ui: { ...state.ui, loading }
      })),

    setError: (error: string | null) =>
      update((state) => ({
        ...state,
        ui: { ...state.ui, error }
      })),

    setStreaming: (streaming: boolean) =>
      update((state) => ({
        ...state,
        ui: { ...state.ui, streaming }
      })),

    toggleMessageExpanded: (messageId: string) =>
      update((state) => {
        const expandedIds = new Set(state.ui.expandedMessageIds);
        if (expandedIds.has(messageId)) {
          expandedIds.delete(messageId);
        } else {
          expandedIds.add(messageId);
        }

        return {
          ...state,
          ui: {
            ...state.ui,
            expandedMessageIds: expandedIds
          }
        };
      }),

    setSelectedModel: (modelId: string) =>
      update((state) => {
        const newState = {
          ...state,
          ui: {
            ...state.ui,
            selectedModelId: modelId
          }
        };
        persistUIState(newState);
        return newState;
      }),

    setPromptMode: (mode: 'plan' | 'create') =>
      update((state) => {
        const newState = {
          ...state,
          ui: {
            ...state.ui,
            promptMode: mode
          }
        };
        persistUIState(newState);
        return newState;
      })
  };

  // ==================== Pagination Actions ====================

  const pagination = {
    conversations: {
      setCursor: (cursor: string | null) =>
        update((state) => ({
          ...state,
          pagination: {
            ...state.pagination,
            conversations: {
              ...state.pagination.conversations,
              cursor
            }
          }
        })),

      setHasMore: (hasMore: boolean) =>
        update((state) => ({
          ...state,
          pagination: {
            ...state.pagination,
            conversations: {
              ...state.pagination.conversations,
              hasMore
            }
          }
        })),

      setLoading: (loading: boolean) =>
        update((state) => ({
          ...state,
          pagination: {
            ...state.pagination,
            conversations: {
              ...state.pagination.conversations,
              loading
            }
          }
        }))
    },

    messages: {
      setCursor: (conversationId: string, cursor: string | null) =>
        update((state) => ({
          ...state,
          pagination: {
            ...state.pagination,
            messages: {
              ...state.pagination.messages,
              [conversationId]: {
                cursor,
                hasMore: state.pagination.messages[conversationId]?.hasMore ?? true,
                loading: state.pagination.messages[conversationId]?.loading ?? false
              }
            }
          }
        })),

      setHasMore: (conversationId: string, hasMore: boolean) =>
        update((state) => ({
          ...state,
          pagination: {
            ...state.pagination,
            messages: {
              ...state.pagination.messages,
              [conversationId]: {
                cursor: state.pagination.messages[conversationId]?.cursor ?? null,
                hasMore,
                loading: state.pagination.messages[conversationId]?.loading ?? false
              }
            }
          }
        })),

      setLoading: (conversationId: string, loading: boolean) =>
        update((state) => ({
          ...state,
          pagination: {
            ...state.pagination,
            messages: {
              ...state.pagination.messages,
              [conversationId]: {
                cursor: state.pagination.messages[conversationId]?.cursor ?? null,
                hasMore: state.pagination.messages[conversationId]?.hasMore ?? true,
                loading
              }
            }
          }
        }))
    }
  };

  // ==================== Utility Actions ====================

  const utils = {
    // Reset all state
    reset: () => set(initialState),

    // Clear error and loading states
    clearStatus: () =>
      update((state) => ({
        ...state,
        ui: {
          ...state.ui,
          loading: false,
          error: null,
          streaming: false
        }
      })),

    // Initialize with persisted state
    initialize: () => {
      const persisted = loadPersistedState();
      if (Object.keys(persisted).length > 0) {
        update((state) => ({ ...state, ...persisted }));
      }
    }
  };

  return {
    subscribe,
    set,
    update,
    entities,
    ui,
    pagination,
    utils,

    // Combined actions for common operations
    actions: {
      ...entities,
      ...ui,
      ...pagination,
      ...utils
    }
  };
}

// ==================== Export Store ====================

export const chatStore = createChatStore();

// ==================== Derived Selectors ====================

export const activeConversation = derived(chatStore, ($state) =>
  $state.ui.activeConversationId
    ? $state.entities.conversations[$state.ui.activeConversationId]
    : null
);

export const activeConversationMessages = derived(chatStore, ($state) => {
  if (!$state.ui.activeConversationId) return [];

  return Object.values($state.entities.messages)
    .filter((message) => message.conversationId === $state.ui.activeConversationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
});

export const conversationsList = derived(chatStore, ($state) =>
  Object.values($state.entities.conversations).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
);

export const isLoading = derived(chatStore, ($state) => $state.ui.loading);
export const hasError = derived(chatStore, ($state) => !!$state.ui.error);
export const isStreaming = derived(chatStore, ($state) => $state.ui.streaming);

// Initialize store on creation
if (browser) {
  chatStore.actions.initialize();
}
