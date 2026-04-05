<script lang="ts">
  import { createConversation, getConversation } from '$lib/chat/api-client';
  import { chatService } from '$lib/chat/chat-service';
  import { messageStore } from '$lib/chat/message-store';
  import type { StreamEvent } from '$lib/chat/types';
  import { stateStore } from '$lib/util/state';
  import { Loader2 } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import ChatInput from './ChatInput.svelte';
  import ChatMessage from './ChatMessage.svelte';

  interface Props {
    class?: string;
  }

  let { class: className }: Props = $props();

  let messagesContainer = $state<HTMLDivElement | null>(null);
  let streamingContent = $state('');
  let streamingMessageId = $state<string | null>(null);
  let inputValue = $state('');

  onMount(async () => {
    await initializeConversation();
  });

  async function initializeConversation() {
    try {
      const storedId = localStorage.getItem('currentConversationId');

      if (storedId) {
        const response = await getConversation(storedId);
        messageStore.setConversationId(response.conversation.id);
        messageStore.setMessages(response.messages);
      } else {
        const response = await createConversation({ title: 'New Chat' });
        messageStore.setConversationId(response.conversation.id);
        localStorage.setItem('currentConversationId', response.conversation.id);
      }
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
      toast.error('Failed to load conversation');
    }
  }

  async function handleSendMessage(message: string) {
    const conversationId = messageStore.conversationId;
    if (!conversationId) {
      toast.error('No active conversation');
      return;
    }

    messageStore.setStatus('loading');
    messageStore.setError(null);

    const userMessage = {
      id: `msg_${Date.now()}`,
      role: 'user' as const,
      content: message,
      parts: [{ type: 'text' as const, text: message }]
    };

    messageStore.addMessage(userMessage);

    streamingMessageId = `msg_${Date.now() + 1}`;
    streamingContent = '';

    const assistantMessage = {
      id: streamingMessageId,
      role: 'assistant' as const,
      content: '',
      parts: [{ type: 'text' as const, text: '' }]
    };

    messageStore.addMessage(assistantMessage);
    messageStore.setStatus('streaming');

    try {
      await chatService.sendMessage({
        conversationId,
        message,
        currentDiagram: $stateStore.code,
        onStream: handleStreamEvent
      });

      messageStore.setStatus('idle');
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      messageStore.setError(errorMessage);
      messageStore.setStatus('error');
      toast.error(errorMessage);
    } finally {
      streamingMessageId = null;
      streamingContent = '';
    }
  }

  function handleStreamEvent(event: StreamEvent) {
    if (!streamingMessageId) return;

    if (event.type === 'text' && event.content) {
      streamingContent += event.content;
      messageStore.updateMessage(streamingMessageId, {
        content: streamingContent,
        parts: [{ type: 'text', text: streamingContent }]
      });
    } else if (event.type === 'diagram' && event.data) {
      const diagram = chatService.extractDiagramData(event);
      if (diagram) {
        streamingContent += `\n\n\`\`\`mermaid\n${diagram.code}\n\`\`\`\n\n${diagram.explanation || ''}`;
        messageStore.updateMessage(streamingMessageId, {
          content: streamingContent,
          parts: [{ type: 'text', text: streamingContent }]
        });
      }
    } else if (event.type === 'error') {
      toast.error(event.content || 'An error occurred');
    }

    scrollToBottom();
  }

  function scrollToBottom() {
    if (messagesContainer) {
      setTimeout(() => {
        messagesContainer?.scrollTo({
          top: messagesContainer.scrollHeight,
          behavior: 'smooth'
        });
      }, 50);
    }
  }

  $effect(() => {
    if (messageStore.messages.length > 0) {
      scrollToBottom();
    }
  });
</script>

<div class="chat-container {className}">
  <div class="messages-container" bind:this={messagesContainer}>
    {#if messageStore.messages.length === 0}
      <div class="empty-state">
        <p>Start a conversation by asking me to create or modify a diagram.</p>
      </div>
    {:else}
      {#each messageStore.messages as message (message.id)}
        <ChatMessage {message} />
      {/each}
    {/if}

    {#if messageStore.status === 'loading'}
      <div class="loading-indicator">
        <Loader2 class="h-5 w-5 animate-spin" />
        <span>Thinking...</span>
      </div>
    {/if}
  </div>

  <ChatInput
    bind:value={inputValue}
    onSubmit={handleSendMessage}
    disabled={messageStore.status === 'loading' || messageStore.status === 'streaming'}
    loading={messageStore.status === 'loading' || messageStore.status === 'streaming'} />
</div>

<style>
  .chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: hsl(var(--background));
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: hsl(var(--muted-foreground));
    text-align: center;
    padding: 2rem;
  }

  .loading-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    color: hsl(var(--muted-foreground));
  }
</style>
