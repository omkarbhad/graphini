// Svelte stores for chat state management
// Using traditional writable stores for compatibility

import { derived, get, writable } from 'svelte/store';
import { DEFAULT_SETTINGS } from './chatConstants';
import type { Conversation, ConversationSettings, Message } from './messageTypes';

// Message store using writable
function createMessageStore() {
  const { subscribe, set, update } = writable<Map<string, Message>>(new Map());

  return {
    subscribe,

    addMessage: (message: Message) => {
      update((messages) => {
        messages.set(message.id, message);
        return new Map(messages);
      });
    },

    removeMessage: (id: string) => {
      update((messages) => {
        messages.delete(id);
        return new Map(messages);
      });
    },

    getMessage: (id: string) => {
      let result: Message | undefined;
      update((messages) => {
        result = messages.get(id);
        return messages;
      });
      return result;
    },

    getAllMessages: () => {
      let result: Message[] = [];
      update((messages) => {
        result = Array.from(messages.values());
        return messages;
      });
      return result;
    },

    clearMessages: () => {
      set(new Map());
    },

    updateMessage: (id: string, updates: Partial<Message>) => {
      update((messages) => {
        const message = messages.get(id);
        if (message) {
          messages.set(id, { ...message, ...updates });
        }
        return new Map(messages);
      });
    }
  };
}

// Conversation store using writable
function createConversationStore() {
  const conversations = writable<Map<string, Conversation>>(new Map());
  const activeConversationId = writable<string | null>(null);

  return {
    subscribe: conversations.subscribe,
    activeId: activeConversationId,

    addConversation: (conversation: Conversation) => {
      conversations.update((convs) => {
        convs.set(conversation.id, conversation);
        return new Map(convs);
      });
    },

    removeConversation: (id: string) => {
      conversations.update((convs) => {
        convs.delete(id);
        return new Map(convs);
      });
      activeConversationId.update((activeId) => (activeId === id ? null : activeId));
    },

    getConversation: (id: string) => {
      let result: Conversation | undefined;
      conversations.update((convs) => {
        result = convs.get(id);
        return convs;
      });
      return result;
    },

    getAllConversations: () => {
      let result: Conversation[] = [];
      conversations.update((convs) => {
        result = Array.from(convs.values());
        return convs;
      });
      return result;
    },

    setActiveConversation: (id: string | null) => {
      activeConversationId.set(id);
    },

    getActiveConversation: () => {
      const activeId = get(activeConversationId);
      if (!activeId) return null;
      let result: Conversation | undefined;
      conversations.update((convs) => {
        result = convs.get(activeId);
        return convs;
      });
      return result || null;
    },

    updateConversation: (id: string, updates: Partial<Conversation>) => {
      conversations.update((convs) => {
        const conversation = convs.get(id);
        if (conversation) {
          convs.set(id, {
            ...conversation,
            ...updates,
            updatedAt: new Date()
          });
        }
        return new Map(convs);
      });
    }
  };
}

// Settings store using writable
function createSettingsStore() {
  const { subscribe, set, update } = writable<ConversationSettings>({ ...DEFAULT_SETTINGS });

  return {
    subscribe,

    updateSettings: (newSettings: Partial<ConversationSettings>) => {
      update((settings) => ({ ...settings, ...newSettings }));
    },

    getSettings: () => {
      let result: ConversationSettings = { ...DEFAULT_SETTINGS };
      update((settings) => {
        result = settings;
        return settings;
      });
      return result;
    },

    resetSettings: () => {
      set({ ...DEFAULT_SETTINGS });
    }
  };
}

// Streaming state store using writable
function createStreamingStore() {
  const isStreaming = writable(false);
  const error = writable<string | null>(null);

  return {
    isStreaming,
    error,

    setStreaming: (streaming: boolean) => {
      isStreaming.set(streaming);
    },

    setError: (err: string | null) => {
      error.set(err);
    },

    clearError: () => {
      error.set(null);
    }
  };
}

// UI state store using writable
function createUIStore() {
  const sidebarOpen = writable(true);
  const showReasoning = writable(true);
  const autoScroll = writable(true);
  const theme = writable<'light' | 'dark'>('light');

  return {
    sidebarOpen,
    showReasoning,
    autoScroll,
    theme,

    toggleSidebar: () => {
      sidebarOpen.update((v) => !v);
    },

    toggleReasoning: () => {
      showReasoning.update((v) => !v);
    },

    toggleAutoScroll: () => {
      autoScroll.update((v) => !v);
    },

    setTheme: (newTheme: 'light' | 'dark') => {
      theme.set(newTheme);
    }
  };
}

// Search store using writable
function createSearchStore() {
  const query = writable('');
  const results = writable<Message[]>([]);
  const isSearching = writable(false);

  return {
    query,
    results,
    isSearching,

    setQuery: (newQuery: string) => {
      query.set(newQuery);
    },

    setResults: (newResults: Message[]) => {
      results.set(newResults);
    },

    setSearching: (searching: boolean) => {
      isSearching.set(searching);
    },

    clearSearch: () => {
      query.set('');
      results.set([]);
      isSearching.set(false);
    }
  };
}

// Create and export stores
export const messageStore = createMessageStore();
export const conversationStore = createConversationStore();
export const settingsStore = createSettingsStore();
export const streamingStore = createStreamingStore();
export const uiStore = createUIStore();
export const searchStore = createSearchStore();

// Derived stores
export const activeConversation = derived(
  [conversationStore, conversationStore.activeId],
  ([$conversations, $activeId]) => {
    return $activeId ? $conversations.get($activeId) : null;
  }
);

export const activeMessages = derived(activeConversation, ($activeConversation) => {
  return $activeConversation?.messages || [];
});

export const conversationCount = derived(conversationStore, ($conversations) => {
  return $conversations.size;
});

export const hasActiveConversation = derived(conversationStore.activeId, ($activeId) => {
  return $activeId !== null;
});

export const totalMessages = derived(messageStore, ($messages) => {
  return $messages.size;
});

// Utility functions for store operations
export const chatActions = {
  // Message actions
  sendMessage: async (content: string, attachments?: any[]) => {
    const message: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      attachments
    };

    messageStore.addMessage(message);

    // TODO: Implement actual API call
    console.log('Sending message:', message);
  },

  retryMessage: async (messageId: string) => {
    const message = messageStore.getMessage(messageId);
    if (message) {
      await chatActions.sendMessage(message.content);
    }
  },

  deleteMessage: (messageId: string) => {
    messageStore.removeMessage(messageId);
  },

  clearMessages: () => {
    messageStore.clearMessages();
  },

  // Conversation actions
  createConversation: (title?: string) => {
    const conversation: Conversation = {
      id: Date.now().toString(),
      title: title || 'New Conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: settingsStore.getSettings()
    };

    conversationStore.addConversation(conversation);
    conversationStore.setActiveConversation(conversation.id);

    return conversation;
  },

  loadConversation: (conversationId: string) => {
    const conversation = conversationStore.getConversation(conversationId);
    if (conversation) {
      conversationStore.setActiveConversation(conversationId);

      // Load messages into message store
      messageStore.clearMessages();
      conversation.messages.forEach((msg) => {
        messageStore.addMessage(msg);
      });
    }
  },

  deleteConversation: (conversationId: string) => {
    conversationStore.removeConversation(conversationId);
  },

  updateConversationTitle: (conversationId: string, title: string) => {
    conversationStore.updateConversation(conversationId, { title });
  },

  // Settings actions
  updateSettings: (settings: Partial<ConversationSettings>) => {
    settingsStore.updateSettings(settings);

    // Also update active conversation if it exists
    const activeConv = conversationStore.getActiveConversation();
    if (activeConv) {
      conversationStore.updateConversation(activeConv.id, { settings });
    }
  },

  // UI actions
  toggleSidebar: () => {
    uiStore.toggleSidebar();
  },

  toggleReasoning: () => {
    uiStore.toggleReasoning();
  },

  toggleAutoScroll: () => {
    uiStore.toggleAutoScroll();
  },

  setTheme: (theme: 'light' | 'dark') => {
    uiStore.setTheme(theme);
  }
};
