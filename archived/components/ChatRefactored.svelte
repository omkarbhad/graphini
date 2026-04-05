<script lang="ts">
  import { createConversation, getConversation } from '$lib/chat/api-client';
  import { Button } from '$lib/components/ui/button';
  import {
    activeConversation,
    activeConversationMessages,
    chatStore,
    hasError,
    isLoading,
    isStreaming
  } from '$lib/stores/chat-store';
  import { ArrowUp, Code2, Loader2, Sparkles } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';

  // Props
  interface Props {
    onClearChat?: () => void;
    class?: string;
  }

  let { onClearChat, class: className }: Props = $props();

  // Local state (UI-only)
  let messageText = $state('');
  let messagesContainerRef = $state<HTMLDivElement | null>(null);
  let fileInputRef = $state<HTMLInputElement | null>(null);

  // Subscribe to store state using Svelte 5 syntax
  let activeConv = $derived.by(() => $activeConversation);
  let messages = $derived.by(() => $activeConversationMessages);
  let loading = $derived.by(() => $isLoading);
  let error = $derived.by(() => $hasError);
  let streaming = $derived.by(() => $isStreaming);

  // Model options
  const MODEL_OPTIONS = [
    { id: 'gpt-5-mini', name: 'gpt-5-mini', icon: '🧠' },
    { id: 'gpt-5-nano', name: 'GPT-5 Nano', icon: '⚡' }
  ];

  // Auto-scroll to bottom when messages change
  $effect(() => {
    if (messages && messages.length > 0 && messagesContainerRef) {
      setTimeout(() => {
        messagesContainerRef?.scrollTo({
          top: messagesContainerRef.scrollHeight,
          behavior: 'smooth'
        });
      }, 50);
    }
  });

  // Initialize conversation on mount
  onMount(async () => {
    try {
      chatStore.actions.setLoading(true);

      // Try to load existing conversation from localStorage
      const storedConversationId = localStorage.getItem('currentConversationId');

      if (storedConversationId) {
        const response = await getConversation(storedConversationId);

        if (response.conversation) {
          // Add conversation to store
          chatStore.actions.addConversation(response.conversation);

          // Add messages to store
          response.messages.forEach((msg) => {
            chatStore.actions.addMessage(msg);
          });

          // Set as active conversation
          chatStore.actions.setActiveConversation(storedConversationId);
        } else {
          // Create new conversation if stored one doesn't exist
          await createNewConversation();
        }
      } else {
        await createNewConversation();
      }
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      toast.error('Failed to initialize chat');
      chatStore.actions.setError('Failed to load conversation');
    } finally {
      chatStore.actions.setLoading(false);
    }
  });

  async function createNewConversation(): Promise<void> {
    try {
      const response = await createConversation({
        title: 'New Chat'
      });

      const conversation = response.conversation;

      // Add to store
      chatStore.actions.addConversation(conversation);
      chatStore.actions.setActiveConversation(conversation.id);

      // Save to localStorage
      localStorage.setItem('currentConversationId', conversation.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create conversation');
      throw error;
    }
  }

  async function sendChatRequest(): Promise<void> {
    if (!messageText.trim() || !activeConv || streaming) return;

    const userMessage = {
      id: `msg_${Date.now()}`,
      conversationId: activeConv?.id || '',
      role: 'user' as const,
      content: messageText.trim(),
      parts: [{ type: 'text', text: messageText.trim() }],
      createdAt: new Date().toISOString()
    };

    try {
      // Clear input
      messageText = '';

      // Add user message to store
      chatStore.actions.addMessage(userMessage);
      chatStore.actions.setStreaming(true);
      chatStore.actions.clearStatus();

      // Create assistant message placeholder
      const assistantMessage = {
        id: `msg_${Date.now() + 1}`,
        conversationId: activeConv?.id || '',
        role: 'assistant' as const,
        content: '',
        parts: [{ type: 'text', text: '' }],
        createdAt: new Date().toISOString()
      };

      chatStore.actions.addMessage(assistantMessage);

      // Send to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConv?.id || '',
          currentDiagram: '', // Get from editor state
          message: userMessage,
          mode: 'create', // Get from store
          model: 'gpt-5-mini', // Get from store
          userId: 'user@example.com' // Get from auth
        })
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let assistantText = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n\n');

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;

              try {
                const event = JSON.parse(line.slice(6));

                switch (event.type) {
                  case 'text':
                    assistantText += event.content;
                    chatStore.actions.updateMessage(assistantMessage.id, {
                      content: assistantText,
                      parts: [{ type: 'text', text: assistantText }]
                    });
                    break;

                  case 'tool_call_complete':
                    // Handle tool completion
                    if (event.name === 'create_diagram') {
                      // Update diagram in editor
                      // This would integrate with the editor state
                    }
                    break;

                  case 'error':
                    throw new Error(event.message);

                  case 'done':
                    // Stream completed
                    break;
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE event:', parseError);
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (error) {
      console.error('Chat request failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
      chatStore.actions.setError(error instanceof Error ? error.message : 'Request failed');
    } finally {
      chatStore.actions.setStreaming(false);
    }
  }

  function handleClearChat(): void {
    if (onClearChat) {
      onClearChat();
    }

    // Clear current conversation from store
    if (activeConv?.id) {
      chatStore.actions.removeConversation(activeConv.id);
    }

    // Create new conversation
    createNewConversation();

    // Clear localStorage
    localStorage.removeItem('currentConversationId');
  }

  function toggleMessageExpanded(messageId: string): void {
    chatStore.actions.toggleMessageExpanded(messageId);
  }

  function isMessageExpanded(messageId: string): boolean {
    // This would come from store state
    return false; // Placeholder
  }

  // Keyboard shortcuts
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendChatRequest();
    }
  }

  // Extract Mermaid code from message
  function extractMermaidCode(message: any): string | null {
    const text = message.content || '';
    const match = text.match(/```mermaid\n?([\s\S]*?)```/);
    return match ? match[1].trim() : null;
  }

  // Sync diagram to editor
  function syncDiagramToEditor(mermaidCode: string, messageId: string): void {
    if (!mermaidCode.trim()) return;

    // This would integrate with the editor state management
    console.log('Syncing diagram to editor:', { mermaidCode, messageId });
  }
</script>

<div class="flex h-full flex-col {className}">
  <!-- Messages Container -->
  <div bind:this={messagesContainerRef} class="flex-1 space-y-4 overflow-y-auto p-4">
    {#if loading}
      <div class="flex h-32 items-center justify-center">
        <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
        <span class="ml-2 text-muted-foreground">Loading conversation...</span>
      </div>
    {:else if error}
      <div class="flex h-32 items-center justify-center text-destructive">
        <span>Error: {error}</span>
      </div>
    {:else if !messages || messages.length === 0}
      <div class="flex h-32 items-center justify-center text-muted-foreground">
        <span>No messages yet. Start a conversation!</span>
      </div>
    {:else}
      {#each messages as message (message.id)}
        {@const messageObj = message as any}
        <div class="flex gap-3 {messageObj.role === 'user' ? 'justify-end' : 'justify-start'}">
          <!-- Avatar -->
          <div
            class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
            {#if messageObj.role === 'user'}
              <span class="text-xs font-medium">U</span>
            {:else}
              <Sparkles class="h-4 w-4 text-primary" />
            {/if}
          </div>

          <!-- Message Content -->
          <div class="max-w-[70%] space-y-2">
            <div class="rounded-lg border bg-card p-3">
              <div class="text-sm whitespace-pre-wrap">{messageObj.content}</div>

              <!-- Mermaid Diagram Preview -->
              {#if extractMermaidCode(messageObj)}
                <div class="mt-2 rounded border bg-muted/50 p-2">
                  <div class="mb-2 flex items-center justify-between">
                    <span class="text-xs font-medium text-muted-foreground">Mermaid Diagram</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={() =>
                        syncDiagramToEditor(extractMermaidCode(messageObj)!, messageObj.id)}
                      class="h-6 px-2 text-xs">
                      <Code2 class="mr-1 h-3 w-3" />
                      Use This
                    </Button>
                  </div>
                  <pre class="overflow-x-auto text-xs">{extractMermaidCode(messageObj)}</pre>
                </div>
              {/if}
            </div>

            <!-- Message Actions -->
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{new Date(messageObj.createdAt).toLocaleTimeString()}</span>
              {#if messageObj.role === 'assistant'}
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => toggleMessageExpanded(messageObj.id)}
                  class="h-6 px-2">
                  {isMessageExpanded(messageObj.id) ? 'Hide' : 'Show'} Code
                </Button>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    {/if}

    <!-- Streaming Indicator -->
    {#if streaming}
      <div class="flex justify-start gap-3">
        <div
          class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Sparkles class="h-4 w-4 animate-pulse text-primary" />
        </div>
        <div class="max-w-[70%]">
          <div class="rounded-lg border bg-card p-3">
            <div class="flex items-center gap-2">
              <Loader2 class="h-4 w-4 animate-spin" />
              <span class="text-sm text-muted-foreground">AI is thinking...</span>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Input Area -->
  <div class="border-t p-4">
    <div class="flex gap-2">
      <textarea
        bind:value={messageText}
        onkeydown={handleKeydown}
        placeholder="Type your message..."
        disabled={loading || streaming}
        class="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        rows="3" />

      <div class="flex flex-col gap-2">
        <Button
          onclick={sendChatRequest}
          disabled={!messageText.trim() || loading || streaming}
          size="sm"
          class="px-3">
          {#if streaming}
            <Loader2 class="h-4 w-4 animate-spin" />
          {:else}
            <ArrowUp class="h-4 w-4" />
          {/if}
        </Button>

        <Button
          variant="outline"
          onclick={handleClearChat}
          disabled={loading || streaming}
          size="sm"
          class="px-3">
          Clear
        </Button>
      </div>
    </div>

    <!-- File Input (Hidden) -->
    <input
      type="file"
      bind:this={fileInputRef}
      accept="image/*,.txt,.md"
      multiple
      style="display: none" />
  </div>
</div>

<style>
  /* Custom scrollbar styling */
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: hsl(var(--muted-foreground) / 0.3);
    border-radius: 3px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background-color: hsl(var(--muted-foreground) / 0.5);
  }
</style>
