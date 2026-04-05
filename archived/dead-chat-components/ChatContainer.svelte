<script lang="ts">
  import { onMount, setContext } from 'svelte';
  // Import AI elements
  import { PromptInput, type PromptInputMessage } from './ai-elements/prompt-input';
  // Import core components
  import { ChatMessages } from './chat-core';
  // Import UI components
  import { ChatHeader, StreamingIndicator } from './chat-ui';

  interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }

  interface Props {
    onClearChat?: () => void;
    onSyncMessages?: () => Promise<void>;
    class?: string;
  }

  let { onClearChat, onSyncMessages, class: className = '' }: Props = $props();

  // Chat state management
  let messages = $state<ChatMessage[]>([]);
  let isStreaming = $state(false);
  let error = $state<string | null>(null);

  // Set up chat context for child components
  onMount(() => {
    setContext('chatState', {
      messages,
      isStreaming,
      error
    });
  });

  // Handle message submission
  async function handleSubmit(message: PromptInputMessage) {
    if (!message.text?.trim() || isStreaming) return;

    isStreaming = true;
    error = null;

    try {
      // Add user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: message.text,
        timestamp: new Date()
      };
      messages = [...messages, userMessage];

      // TODO: Implement actual API call
      // const response = await chatAPI.sendMessage(message.text);

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Response from AI',
        timestamp: new Date()
      };
      messages = [...messages, assistantMessage];
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      isStreaming = false;
    }
  }
</script>

<div class="chat-container {className}">
  <!-- Chat Header -->
  <ChatHeader {onClearChat} {onSyncMessages} />

  <!-- Messages Area -->
  <div class="messages-container flex-1 overflow-auto">
    <ChatMessages {messages} />

    <!-- Streaming Indicator -->
    {#if isStreaming}
      <StreamingIndicator />
    {/if}
  </div>

  <!-- Input Area -->
  <div class="input-container border-t border-border">
    <PromptInput onSubmit={handleSubmit} disabled={isStreaming} />
  </div>
</div>

<style>
  .chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: hsl(var(--background));
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .input-container {
    padding: 1rem;
    background: hsl(var(--muted) / 30);
  }
</style>
