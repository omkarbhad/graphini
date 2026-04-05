<script lang="ts">
  import { getContext, setContext } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';

  // Chat state interface
  interface ChatState {
    messages: SvelteMap<string, any>;
    isStreaming: boolean;
    error: string | null;
    activeConversation: string | null;
    settings: {
      model: string;
      temperature: number;
      maxTokens: number;
    };
  }

  // Create chat state
  let chatState = $state<ChatState>({
    messages: new SvelteMap(),
    isStreaming: false,
    error: null,
    activeConversation: null,
    settings: {
      model: 'default',
      temperature: 0.7,
      maxTokens: 2048
    }
  });

  // State management functions
  const state = {
    // Message management
    addMessage: (id: string, message: any) => {
      chatState.messages.set(id, message);
    },

    removeMessage: (id: string) => {
      chatState.messages.delete(id);
    },

    getMessage: (id: string) => {
      return chatState.messages.get(id);
    },

    getAllMessages: () => {
      return Array.from(chatState.messages.values());
    },

    clearMessages: () => {
      chatState.messages.clear();
    },

    // Streaming state
    setStreaming: (streaming: boolean) => {
      chatState.isStreaming = streaming;
    },

    getStreaming: () => {
      return chatState.isStreaming;
    },

    // Error handling
    setError: (error: string | null) => {
      chatState.error = error;
    },

    getError: () => {
      return chatState.error;
    },

    // Conversation management
    setActiveConversation: (id: string | null) => {
      chatState.activeConversation = id;
    },

    getActiveConversation: () => {
      return chatState.activeConversation;
    },

    // Settings
    updateSettings: (settings: Partial<ChatState['settings']>) => {
      chatState.settings = { ...chatState.settings, ...settings };
    },

    getSettings: () => {
      return chatState.settings;
    },

    // Get full state
    getState: () => {
      return chatState;
    }
  };

  // Set context for child components
  setContext('chatState', state);

  // Export state for parent components
  export { state };
</script>

<!-- This component manages state and doesn't render anything -->
<slot {state} />
