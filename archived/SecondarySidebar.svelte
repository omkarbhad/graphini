<script lang="ts">
  import Editor from '$lib/components/editor/Editor.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { conversationsStore } from '$lib/stores/conversations.svelte';
  import { cn } from '$lib/util';
  import { stateStore, updateCodeStore } from '$lib/util/state';
  import {
    Archive,
    Code2,
    FileCode2,
    History,
    MessageSquare,
    Pin,
    Plus,
    Trash2
  } from 'lucide-svelte';
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';

  interface Props {
    collapsed?: boolean;
    children?: Snippet;
    onNewChat?: () => void;
    onClearChat?: () => void;
    onSelectConversation?: (id: string) => void;
    sendChatMessage?: (message: string) => Promise<boolean>;
  }

  let {
    collapsed = false,
    children,
    onNewChat,
    onClearChat,
    onSelectConversation,
    sendChatMessage
  }: Props = $props();

  // Sub tabs: chat, code, history
  let activeSubTab = $state<'chat' | 'code' | 'history'>('chat');

  // Derive file name from mermaid code
  let fileName = $derived.by(() => {
    const code = ($stateStore.code || '').trim();
    if (!code) return 'untitled.mmd';
    const firstLine = code.split('\n')[0]?.trim().toLowerCase() || '';
    const typeMap: Record<string, string> = {
      flowchart: 'flowchart',
      graph: 'flowchart',
      sequencediagram: 'sequence',
      classDiagram: 'class',
      statediagram: 'state',
      erdiagram: 'er',
      gantt: 'gantt',
      pie: 'pie',
      journey: 'journey',
      mindmap: 'mindmap',
      timeline: 'timeline',
      kanban: 'kanban',
      gitgraph: 'gitgraph',
      sankey: 'sankey',
      block: 'block',
      packet: 'packet'
    };
    for (const [key, name] of Object.entries(typeMap)) {
      if (firstLine.startsWith(key.toLowerCase())) return `${name}.mmd`;
    }
    return 'diagram.mmd';
  });

  // Flag to prevent circular updates
  let isInternalSwitch = false;

  // Only sync FROM external editorMode changes (e.g. "Show Editor" button in chat)
  $effect(() => {
    const mode = $stateStore.editorMode;
    if (isInternalSwitch) return;
    if (mode === 'code' && activeSubTab !== 'code') {
      activeSubTab = 'code';
    } else if (mode === 'chat' && activeSubTab !== 'chat' && activeSubTab !== 'history') {
      activeSubTab = 'chat';
    }
  });

  function switchTab(tab: 'chat' | 'code' | 'history') {
    isInternalSwitch = true;
    activeSubTab = tab;
    if (tab === 'code') {
      updateCodeStore({ editorMode: 'code' });
    } else if (tab === 'chat') {
      updateCodeStore({ editorMode: 'chat' });
    }
    // Reset flag after microtask
    queueMicrotask(() => {
      isInternalSwitch = false;
    });
  }

  function formatConvTime(dateStr: string): string {
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

  function handleSelectConversation(id: string) {
    conversationsStore.setActive(id);
    onSelectConversation?.(id);
    switchTab('chat');
  }

  async function handleNewChatFromHistory() {
    if (authStore.isLoggedIn) {
      await conversationsStore.create();
    }
    onNewChat?.();
    switchTab('chat');
  }

  onMount(async () => {
    if (authStore.isLoggedIn) {
      await conversationsStore.fetch();
      // Auto-select first conversation if none active
      if (!conversationsStore.activeId && conversationsStore.list.length > 0) {
        conversationsStore.setActive(conversationsStore.list[0].id);
      }
    }
  });

  async function handleDeleteConversation(e: MouseEvent, id: string) {
    e.stopPropagation();
    await conversationsStore.delete(id);
  }

  async function handleDeleteAllConversations() {
    if (!conversationsStore.list.length) return;
    for (const conv of [...conversationsStore.list]) {
      await conversationsStore.delete(conv.id);
    }
  }
</script>

<div
  class={cn(
    'flex h-full flex-col border-r border-b border-l border-border/40 bg-card transition-all duration-300',
    collapsed ? 'w-0 overflow-hidden' : 'w-full'
  )}>
  <!-- Header -->
  <div class="flex h-11 items-center gap-2.5 border-b border-border/30 bg-card/90 px-3">
    <!-- Tab pills with flat design -->
    <div class="flex flex-1 items-center rounded-lg border border-border/20 bg-muted/20 p-0.5">
      <button
        type="button"
        class={cn(
          'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-all duration-200',
          activeSubTab === 'code'
            ? 'bg-background text-foreground'
            : 'text-muted-foreground/70 hover:bg-muted/40 hover:text-foreground'
        )}
        onclick={() => switchTab('code')}>
        <Code2 class="size-3.5" />
        <span class="truncate">Code</span>
      </button>
      <button
        type="button"
        class={cn(
          'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-all duration-200',
          activeSubTab === 'chat'
            ? 'bg-background text-foreground'
            : 'text-muted-foreground/70 hover:bg-muted/40 hover:text-foreground'
        )}
        onclick={() => switchTab('chat')}>
        <MessageSquare class="size-3.5" />
        <span class="truncate">Chat</span>
      </button>
      <button
        type="button"
        class={cn(
          'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-all duration-200',
          activeSubTab === 'history'
            ? 'bg-background text-foreground'
            : 'text-muted-foreground/70 hover:bg-muted/40 hover:text-foreground'
        )}
        onclick={() => switchTab('history')}>
        <History class="size-3.5" />
        <span class="truncate">History</span>
      </button>
    </div>

    <!-- Context actions with flat design -->
    {#if activeSubTab === 'chat'}
      <div class="flex items-center gap-1">
        <div class="h-5 w-px bg-border/30"></div>
        <button
          type="button"
          class="group flex size-6 items-center justify-center rounded-lg bg-muted/30 text-muted-foreground transition-all duration-200 hover:bg-primary hover:text-primary-foreground"
          title="New chat"
          onclick={() => onNewChat?.()}>
          <Plus class="size-3.5 transition-transform duration-200 group-hover:rotate-90" />
        </button>
        <button
          type="button"
          class="group hover:text-destructive-foreground flex size-6 items-center justify-center rounded-lg bg-muted/30 text-muted-foreground transition-all duration-200 hover:bg-destructive"
          title="Clear chat"
          onclick={() => onClearChat?.()}>
          <Trash2 class="size-3.5 transition-transform duration-200 group-hover:scale-110" />
        </button>
      </div>
    {/if}
  </div>

  <!-- Content Area -->
  <div class="flex-1 overflow-hidden">
    {#if activeSubTab === 'chat'}
      {#if children}
        {@render children()}
      {:else}
        <div class="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <div
            class="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10">
            <img src="/brand/logo.png" alt="Graphini" class="size-6" />
          </div>
          <div>
            <p class="font-medium text-foreground">Graphini AI Assistant</p>
            <p class="text-sm text-muted-foreground">
              Create and edit diagrams with natural language. Ask me to generate flowcharts,
              sequence diagrams, and more.
            </p>
          </div>
        </div>
      {/if}
    {:else if activeSubTab === 'code'}
      <div class="flex h-full flex-col">
        <div class="flex items-center gap-1.5 border-b border-border/30 px-2.5 py-1.5">
          <FileCode2 class="size-4 text-muted-foreground" />
          <span class="text-xs font-medium text-foreground">{fileName}</span>
          <span class="text-[10px] text-muted-foreground">mermaid</span>
        </div>
        <div class="flex-1 overflow-hidden">
          <Editor
            onUpdate={(code) => {
              updateCodeStore({ code });
            }}
            sendChatMessage={async (message) => {
              switchTab('chat');
              if (sendChatMessage) {
                return await sendChatMessage(message);
              }
              return false;
            }} />
        </div>
      </div>
    {:else if activeSubTab === 'history'}
      <!-- Conversations list inline -->
      <div class="flex h-full flex-col">
        <div class="flex items-center justify-between border-b border-border/30 px-2.5 py-2">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            title="New Chat"
            onclick={handleNewChatFromHistory}>
            <Plus class="size-4" />
            New chat
          </button>
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Delete all conversations"
            onclick={handleDeleteAllConversations}>
            <Trash2 class="size-4" />
          </button>
        </div>
        <div class="scrollbar-thin flex-1 overflow-y-auto">
          {#if conversationsStore.isLoading}
            <div class="flex items-center justify-center p-8">
              <span
                class="size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
              ></span>
            </div>
          {:else if !authStore.isLoggedIn}
            <div class="p-6 text-center">
              <History class="mx-auto mb-3 size-8 text-muted-foreground/50" />
              <p class="text-sm text-muted-foreground">Sign in to save conversations</p>
            </div>
          {:else if conversationsStore.list.length === 0}
            <div class="p-6 text-center">
              <MessageSquare class="mx-auto mb-3 size-8 text-muted-foreground/50" />
              <p class="text-sm text-muted-foreground">No conversations yet</p>
              <button
                type="button"
                class="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                onclick={handleNewChatFromHistory}>
                Start a new chat
              </button>
            </div>
          {:else}
            {#each conversationsStore.list as conv (conv.id)}
              <div
                role="button"
                tabindex="0"
                class={cn(
                  'group flex w-full cursor-pointer items-start gap-2.5 border-b border-border/20 px-3 py-2.5 text-left transition-colors hover:bg-muted/40',
                  conv.id === conversationsStore.activeId && 'bg-primary/5'
                )}
                onclick={() => handleSelectConversation(conv.id)}
                onkeydown={(e) => {
                  if (e.key === 'Enter') handleSelectConversation(conv.id);
                }}>
                <MessageSquare class="mt-0.5 size-4 flex-shrink-0 text-muted-foreground" />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <span class="truncate text-sm font-medium text-foreground"
                      >{conv.title || 'Untitled'}</span>
                    {#if conv.is_pinned}<Pin class="size-3 flex-shrink-0 text-primary" />{/if}
                    {#if conv.is_archived}<Archive
                        class="size-3 flex-shrink-0 text-muted-foreground" />{/if}
                  </div>
                  <span class="text-xs text-muted-foreground"
                    >{formatConvTime(conv.updated_at)}</span>
                </div>
                <button
                  type="button"
                  class="flex size-6 items-center justify-center rounded text-muted-foreground/50 opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                  title="Delete conversation"
                  onclick={(e) => handleDeleteConversation(e, conv.id)}>
                  <Trash2 class="size-3.5" />
                </button>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>
