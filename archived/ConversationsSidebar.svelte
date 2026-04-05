<script lang="ts">
  import { conversationsStore } from '$lib/stores/conversations.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { MessageSquare, Plus, Pin, Archive, X } from 'lucide-svelte';
  import { onMount } from 'svelte';

  interface Props {
    onSelectConversation?: (id: string) => void;
    onNewChat?: () => void;
  }

  let { onSelectConversation, onNewChat }: Props = $props();

  onMount(() => {
    if (authStore.isLoggedIn) {
      conversationsStore.fetch();
    }
  });

  function handleSelect(id: string) {
    conversationsStore.setActive(id);
    onSelectConversation?.(id);
    conversationsStore.closeSidebar();
  }

  async function handleNewChat() {
    if (authStore.isLoggedIn) {
      await conversationsStore.create();
    }
    onNewChat?.();
    conversationsStore.closeSidebar();
  }

  function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  }
</script>

{#if conversationsStore.isSidebarOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
    role="presentation"
    onclick={() => conversationsStore.closeSidebar()}
    onkeydown={(e) => e.key === 'Escape' && conversationsStore.closeSidebar()}>
  </div>

  <!-- Sidebar -->
  <div
    class="fixed top-0 left-0 z-50 flex h-full w-72 flex-col border-r border-border bg-card shadow-xl">
    <!-- Header -->
    <div class="flex h-10 items-center justify-between border-b border-border px-3">
      <span class="text-sm font-semibold text-foreground">Conversations</span>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          title="New Chat"
          onclick={handleNewChat}>
          <Plus class="size-3.5" />
        </button>
        <button
          type="button"
          class="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          title="Close"
          onclick={() => conversationsStore.closeSidebar()}>
          <X class="size-3.5" />
        </button>
      </div>
    </div>

    <!-- List -->
    <div class="scrollbar-thin flex-1 overflow-y-auto">
      {#if conversationsStore.isLoading}
        <div class="flex items-center justify-center p-8">
          <span
            class="size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
          ></span>
        </div>
      {:else if !authStore.isLoggedIn}
        <div class="p-6 text-center">
          <MessageSquare class="mx-auto mb-3 size-8 text-muted-foreground" />
          <p class="text-sm text-muted-foreground">Sign in to save and access your conversations</p>
        </div>
      {:else if conversationsStore.list.length === 0}
        <div class="p-6 text-center">
          <MessageSquare class="mx-auto mb-3 size-8 text-muted-foreground" />
          <p class="text-sm text-muted-foreground">No conversations yet</p>
          <button
            type="button"
            class="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
            onclick={handleNewChat}>
            Start a new chat
          </button>
        </div>
      {:else}
        {#each conversationsStore.list as conv (conv.id)}
          <button
            type="button"
            class="flex w-full items-start gap-3 border-b border-border/30 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 {conv.id ===
            conversationsStore.activeId
              ? 'bg-muted/70'
              : ''}"
            onclick={() => handleSelect(conv.id)}>
            <MessageSquare class="mt-0.5 size-3.5 flex-shrink-0 text-muted-foreground" />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <span class="truncate">{conv.title || 'Untitled'}</span>
                {#if conv.is_pinned}
                  <Pin class="size-2.5 flex-shrink-0 text-primary" />
                {/if}
                {#if conv.is_archived}
                  <Archive class="size-2.5 flex-shrink-0 text-muted-foreground" />
                {/if}
              </div>
              <span class="text-[10px] text-muted-foreground">{formatTime(conv.updated_at)}</span>
            </div>
          </button>
        {/each}
      {/if}
    </div>
  </div>
{/if}
