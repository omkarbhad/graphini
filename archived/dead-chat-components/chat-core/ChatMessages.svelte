<script lang="ts">
  import { Message } from '../ai-elements/message';
  import { Reasoning } from '../ai-elements/reasoning';
  import { Response } from '../ai-elements/response';
  import { onMount } from 'svelte';

  interface Props {
    messages: Array<{
      id: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp: Date;
      reasoning?: string;
      toolCalls?: Array<{
        id: string;
        name: string;
        result: any;
      }>;
    }>;
  }

  let { messages }: Props = $props();

  let messagesContainer: HTMLElement;
  let autoScroll = $state(true);

  // Auto-scroll to bottom when new messages arrive
  $: if (messagesContainer && autoScroll) {
    scrollToBottom();
  }

  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function handleScroll() {
    if (messagesContainer) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      autoScroll = scrollTop + clientHeight >= scrollHeight - 10;
    }
  }
</script>

<div bind:this={messagesContainer} class="chat-messages space-y-4" onscroll={handleScroll}>
  {#each messages as message (message.id)}
    <div class="message-wrapper" class:user={message.role === 'user'}>
      <!-- Message Avatar -->
      <div class="message-avatar">
        {#if message.role === 'user'}
          <div class="user-avatar">U</div>
        {:else}
          <div class="assistant-avatar">AI</div>
        {/if}
      </div>

      <!-- Message Content -->
      <div class="message-content">
        <!-- Reasoning (for assistant messages) -->
        {#if message.reasoning && message.role === 'assistant'}
          <div class="reasoning-section mb-2">
            <Reasoning content={message.reasoning} />
          </div>
        {/if}

        <!-- Main Message -->
        <Message {message} class={message.role === 'user' ? 'user-message' : 'assistant-message'} />

        <!-- Tool Calls (for assistant messages) -->
        {#if message.toolCalls && message.toolCalls.length > 0}
          <div class="tool-calls-section mt-2">
            {#each message.toolCalls as toolCall}
              <div class="tool-call">
                <div class="tool-name">{toolCall.name}</div>
                <Response content={toolCall.result} />
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  .chat-messages {
    max-height: 100%;
    overflow-y: auto;
    padding: 1rem;
  }

  .message-wrapper {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .message-wrapper.user {
    flex-direction: row-reverse;
  }

  .message-avatar {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .user-avatar {
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }

  .assistant-avatar {
    background: hsl(var(--secondary));
    color: hsl(var(--secondary-foreground));
  }

  .message-content {
    flex: 1;
    max-width: 80%;
  }

  .message-wrapper.user .message-content {
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    padding: 0.75rem;
    border-radius: 0.75rem;
    border-bottom-right-radius: 0.25rem;
  }

  .message-wrapper:not(.user) .message-content {
    background: hsl(var(--muted));
    padding: 0.75rem;
    border-radius: 0.75rem;
    border-bottom-left-radius: 0.25rem;
  }

  .reasoning-section {
    opacity: 0.8;
    font-size: 0.875rem;
  }

  .tool-calls-section {
    margin-top: 0.5rem;
  }

  .tool-call {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    padding: 0.5rem;
    margin-top: 0.5rem;
  }

  .tool-name {
    font-weight: 600;
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
    color: hsl(var(--primary));
  }
</style>
