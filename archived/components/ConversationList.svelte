<script lang="ts">
  import { deleteConversation, listConversations } from '$lib/chat/api-client';
  import { Button } from '$lib/components/ui/button';
  import { MessageSquare, Plus, Trash2 } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';

  interface Conversation {
    id: string;
    title: string | null;
    created_at: string;
    updated_at: string;
  }

  interface Props {
    currentConversationId?: string;
    onSelectConversation?: (id: string) => void;
    onNewConversation?: () => void;
  }

  let { currentConversationId, onSelectConversation, onNewConversation }: Props = $props();

  let conversations = $state<Conversation[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    await loadConversations();
  });

  async function loadConversations() {
    try {
      loading = true;
      error = null;
      const response = await listConversations({ limit: 50 });
      conversations = response.conversations;
    } catch (err) {
      console.error('Failed to load conversations:', err);
      error = err instanceof Error ? err.message : 'Failed to load conversations';
      toast.error('Failed to load conversations');
    } finally {
      loading = false;
    }
  }

  async function handleDelete(id: string, event: MouseEvent) {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      await deleteConversation(id);
      conversations = conversations.filter((c) => c.id !== id);
      toast.success('Conversation deleted');

      // If deleted current conversation, trigger new conversation
      if (id === currentConversationId && onNewConversation) {
        onNewConversation();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      toast.error('Failed to delete conversation');
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function getTitle(conversation: Conversation): string {
    return conversation.title || 'Untitled Conversation';
  }
</script>

<aside class="flex h-full w-64 flex-col border-r bg-muted/30">
  <!-- Header -->
  <div class="flex items-center justify-between border-b p-4">
    <h2 class="text-lg font-semibold">Conversations</h2>
    <Button size="sm" onclick={onNewConversation}>
      <Plus class="size-4" />
      <span class="sr-only">New conversation</span>
    </Button>
  </div>

  <!-- Conversation List -->
  <div class="flex-1 overflow-y-auto">
    {#if loading}
      <div class="flex items-center justify-center p-8">
        <div class="text-sm text-muted-foreground">Loading...</div>
      </div>
    {:else if error}
      <div class="p-4">
        <div class="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <p class="text-sm text-destructive">{error}</p>
          <Button size="sm" variant="outline" onclick={loadConversations} class="mt-2">
            Retry
          </Button>
        </div>
      </div>
    {:else if conversations.length === 0}
      <div class="flex flex-col items-center justify-center p-8 text-center">
        <MessageSquare class="mb-2 size-8 text-muted-foreground" />
        <p class="text-sm text-muted-foreground">No conversations yet</p>
        <Button size="sm" onclick={onNewConversation} class="mt-4">Start a conversation</Button>
      </div>
    {:else}
      <div class="space-y-1 p-2">
        {#each conversations as conversation (conversation.id)}
          <button
            class="group flex w-full items-start gap-2 rounded-lg p-3 text-left transition-colors hover:bg-muted"
            class:bg-muted={conversation.id === currentConversationId}
            onclick={() => onSelectConversation?.(conversation.id)}>
            <MessageSquare class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-medium">
                {getTitle(conversation)}
              </div>
              <div class="text-xs text-muted-foreground">
                {formatDate(conversation.updated_at)}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              class="size-6 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100"
              onclick={(e) => handleDelete(conversation.id, e)}>
              <Trash2 class="size-3" />
              <span class="sr-only">Delete</span>
            </Button>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Footer -->
  <div class="border-t p-4">
    <div class="text-xs text-muted-foreground">
      {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
    </div>
  </div>
</aside>

<style>
  /* Custom scrollbar */
  aside :global(.overflow-y-auto) {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
  }

  aside :global(.overflow-y-auto::-webkit-scrollbar) {
    width: 6px;
  }

  aside :global(.overflow-y-auto::-webkit-scrollbar-track) {
    background: transparent;
  }

  aside :global(.overflow-y-auto::-webkit-scrollbar-thumb) {
    background-color: hsl(var(--muted-foreground) / 0.3);
    border-radius: 3px;
  }
</style>
