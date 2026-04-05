<script lang="ts">
  import type { Message } from '$lib/stores/chat-store';
  import { Loader2, Sparkles } from 'lucide-svelte';
  import ChatMessageComponent from './ChatMessageComponent.svelte';

  interface Props {
    messages: Message[];
    loading?: boolean;
    error?: string | null;
    streaming?: boolean;
    onToggleExpanded?: (messageId: string) => void;
    onSyncDiagram?: (mermaidCode: string, messageId: string) => void;
    isMessageExpanded?: (messageId: string) => boolean;
  }

  let {
    messages = [],
    loading = false,
    error = null,
    streaming = false,
    onToggleExpanded,
    onSyncDiagram,
    isMessageExpanded
  }: Props = $props();

  // Auto-scroll container ref
  let containerRef = $state<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when messages change
  $effect(() => {
    if (messages.length > 0 && containerRef) {
      setTimeout(() => {
        containerRef?.scrollTo({
          top: containerRef.scrollHeight,
          behavior: 'smooth'
        });
      }, 50);
    }
  });
</script>

<div bind:this={containerRef} class="flex-1 space-y-4 overflow-y-auto p-4">
  {#if loading}
    <div class="flex h-32 items-center justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
      <span class="ml-2 text-muted-foreground">Loading conversation...</span>
    </div>
  {:else if error}
    <div class="flex h-32 items-center justify-center text-destructive">
      <span>Error: {error}</span>
    </div>
  {:else if messages.length === 0}
    <div class="flex h-32 items-center justify-center text-muted-foreground">
      <span>No messages yet. Start a conversation!</span>
    </div>
  {:else}
    {#each messages as message (message.id)}
      <ChatMessageComponent
        {message}
        isExpanded={isMessageExpanded?.(message.id)}
        {onToggleExpanded}
        {onSyncDiagram} />
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
