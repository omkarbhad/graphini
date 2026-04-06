<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Button } from '$lib/components/ui/button';
  import { authStore } from '$lib/stores/auth.svelte';
  import { workspaceStore } from '$lib/stores/workspace.svelte';
  import type { DiagramWorkspaceSummary } from '$lib/types/workspace';
  import {
    Plus,
    Search,
    Clock,
    Star,
    MoreHorizontal,
    Folder,
    GitBranch,
    Network,
    Workflow,
    Table2,
    BarChart3,
    Calendar,
    FileText,
    Trash2,
    Copy,
    Loader2,
    LayoutDashboard,
    Share2,
    LogOut,
    User,
    Sparkles,
    Command,
    ArrowUpRight
  } from 'lucide-svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import * as Dialog from '$lib/components/ui/dialog';
  import { onMount, onDestroy, type ComponentType } from 'svelte';
  import { fly, fade, scale } from 'svelte/transition';
  import { cubicOut, backOut } from 'svelte/easing';
  import { mode } from 'mode-watcher';

  const typeIcons: Record<string, ComponentType> = {
    class: Network,
    default: FileText,
    erd: Table2,
    flowchart: Workflow,
    gantt: Calendar,
    sequence: GitBranch,
    state: BarChart3
  };

  let workspaces = $state<DiagramWorkspaceSummary[]>([]);
  let totalCount = $state(0);
  let loading = $state(true);
  let creating = $state(false);
  let searchQuery = $state('');
  let activeFilter = $state('all');
  let deleteTarget = $state<{ id: string; title: string } | null>(null);
  let deleting = $state(false);
  let searchTimeout: ReturnType<typeof setTimeout>;
  let mounted = $state(false);
  let searchFocused = $state(false);

  const sidebarItems = [
    { id: 'all', label: 'All Diagrams', icon: LayoutDashboard, count: 0 },
    { id: 'starred', label: 'Starred', icon: Star, count: 0 },
    { id: 'shared', label: 'Shared with me', icon: Share2, count: 0 }
  ];

  const typeGradientsDark: Record<
    string,
    { bg: string; border: string; text: string; glow: string }
  > = {
    class: {
      bg: 'rgba(6, 182, 212, 0.06)',
      border: 'rgba(6, 182, 212, 0.12)',
      text: '#67e8f9',
      glow: 'rgba(6, 182, 212, 0.08)'
    },
    erd: {
      bg: 'rgba(59, 130, 246, 0.06)',
      border: 'rgba(59, 130, 246, 0.12)',
      text: '#93c5fd',
      glow: 'rgba(59, 130, 246, 0.08)'
    },
    flowchart: {
      bg: 'rgba(139, 92, 246, 0.06)',
      border: 'rgba(139, 92, 246, 0.12)',
      text: '#c4b5fd',
      glow: 'rgba(139, 92, 246, 0.08)'
    },
    gantt: {
      bg: 'rgba(245, 158, 11, 0.06)',
      border: 'rgba(245, 158, 11, 0.12)',
      text: '#fcd34d',
      glow: 'rgba(245, 158, 11, 0.08)'
    },
    sequence: {
      bg: 'rgba(16, 185, 129, 0.06)',
      border: 'rgba(16, 185, 129, 0.12)',
      text: '#6ee7b7',
      glow: 'rgba(16, 185, 129, 0.08)'
    },
    state: {
      bg: 'rgba(244, 63, 94, 0.06)',
      border: 'rgba(244, 63, 94, 0.12)',
      text: '#fda4af',
      glow: 'rgba(244, 63, 94, 0.08)'
    }
  };

  const typeGradientsLight: Record<
    string,
    { bg: string; border: string; text: string; glow: string }
  > = {
    class: {
      bg: 'rgba(6, 182, 212, 0.06)',
      border: 'rgba(6, 182, 212, 0.18)',
      text: '#0891b2',
      glow: 'rgba(6, 182, 212, 0.08)'
    },
    erd: {
      bg: 'rgba(59, 130, 246, 0.06)',
      border: 'rgba(59, 130, 246, 0.18)',
      text: '#2563eb',
      glow: 'rgba(59, 130, 246, 0.08)'
    },
    flowchart: {
      bg: 'rgba(139, 92, 246, 0.06)',
      border: 'rgba(139, 92, 246, 0.18)',
      text: '#7c3aed',
      glow: 'rgba(139, 92, 246, 0.08)'
    },
    gantt: {
      bg: 'rgba(245, 158, 11, 0.06)',
      border: 'rgba(245, 158, 11, 0.18)',
      text: '#d97706',
      glow: 'rgba(245, 158, 11, 0.08)'
    },
    sequence: {
      bg: 'rgba(16, 185, 129, 0.06)',
      border: 'rgba(16, 185, 129, 0.18)',
      text: '#059669',
      glow: 'rgba(16, 185, 129, 0.08)'
    },
    state: {
      bg: 'rgba(244, 63, 94, 0.06)',
      border: 'rgba(244, 63, 94, 0.18)',
      text: '#e11d48',
      glow: 'rgba(244, 63, 94, 0.08)'
    }
  };

  const defaultGradientDark = {
    bg: 'rgba(255, 255, 255, 0.02)',
    border: 'rgba(255, 255, 255, 0.06)',
    text: 'rgba(255, 255, 255, 0.4)',
    glow: 'rgba(255, 255, 255, 0.02)'
  };

  const defaultGradientLight = {
    bg: 'rgba(0, 0, 0, 0.02)',
    border: 'rgba(0, 0, 0, 0.06)',
    text: 'rgba(0, 0, 0, 0.4)',
    glow: 'rgba(0, 0, 0, 0.02)'
  };

  function getTypeStyle(type: string | null) {
    const isDark = $mode === 'dark';
    const gradients = isDark ? typeGradientsDark : typeGradientsLight;
    const fallback = isDark ? defaultGradientDark : defaultGradientLight;
    return gradients[type || ''] || fallback;
  }

  async function loadWorkspaces() {
    loading = true;
    const result = await workspaceStore.list({
      starred: activeFilter === 'starred',
      search: searchQuery || undefined
    });
    workspaces = result.workspaces;
    totalCount = result.total;
    loading = false;
  }

  onMount(() => {
    mounted = true;
    authStore.init();
    loadWorkspaces();

    // Global keyboard shortcut for search
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>('.search-input');
        input?.focus();
      }
    }
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    clearTimeout(searchTimeout);
  });

  $effect(() => {
    void activeFilter;
    loadWorkspaces();
  });

  function handleSearchInput(e: Event) {
    searchQuery = (e.target as HTMLInputElement).value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadWorkspaces(), 400);
  }

  async function handleNewWorkspace() {
    if (!authStore.isLoggedIn) {
      authStore.login();
      return;
    }
    creating = true;
    const ws = await workspaceStore.create();
    creating = false;
    if (ws) goto(resolve(`/workspace/${ws.id}`));
  }

  async function handleStar(ws: DiagramWorkspaceSummary) {
    const s = !ws.is_starred;
    await workspaceStore.toggleStar(ws.id, s);
    ws.is_starred = s;
    workspaces = [...workspaces];
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    deleting = true;
    await workspaceStore.delete(deleteTarget.id);
    workspaces = workspaces.filter((w) => w.id !== deleteTarget?.id);
    totalCount--;
    deleting = false;
    deleteTarget = null;
  }

  async function handleDuplicate(ws: DiagramWorkspaceSummary) {
    const dup = await workspaceStore.duplicate(ws.id);
    if (dup) loadWorkspaces();
  }

  function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    const ms = Date.now() - d.getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  }
</script>

<svelte:head><title>Dashboard — Graphini</title></svelte:head>

<!-- Delete Confirmation Dialog -->
{#if deleteTarget}
  <Dialog.Root
    open={!!deleteTarget}
    onOpenChange={(o) => {
      if (!o) deleteTarget = null;
    }}>
    <Dialog.Content class="delete-dialog max-w-sm">
      <Dialog.Header>
        <Dialog.Title class="text-[15px] font-semibold text-foreground"
          >Delete workspace</Dialog.Title>
        <Dialog.Description class="text-[13px] text-muted-foreground">
          Are you sure you want to delete <strong class="text-foreground/80"
            >"{deleteTarget.title}"</strong
          >? This action cannot be undone.
        </Dialog.Description>
      </Dialog.Header>
      <div class="flex justify-end gap-2.5 pt-5">
        <Button variant="outline" size="sm" onclick={() => (deleteTarget = null)}>Cancel</Button>
        <Button variant="destructive" size="sm" disabled={deleting} onclick={confirmDelete}>
          {#if deleting}<Loader2 class="mr-1.5 size-3.5 animate-spin" />{/if}Delete
        </Button>
      </div>
    </Dialog.Content>
  </Dialog.Root>
{/if}

<div class="dash-root">
  <!-- Ambient background -->
  <div class="pointer-events-none fixed inset-0 z-0">
    <div class="ambient-grid"></div>
    <div class="ambient-orb ambient-orb-1"></div>
    <div class="ambient-orb ambient-orb-2"></div>
  </div>

  <!-- Sidebar -->
  <aside class="dash-sidebar">
    <div class="flex h-full flex-col">
      <!-- Logo -->
      <div class="sidebar-header">
        <a href={resolve('/')} class="flex items-center gap-2.5">
          <img src="/brand/logo.png" alt="Graphini" class="size-7 rounded-lg" />
          <span class="text-[14px] font-semibold tracking-tight text-foreground/90">Graphini</span>
        </a>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-3 py-3">
        <div class="dash-section-label">Workspace</div>
        <div class="space-y-0.5">
          {#each sidebarItems as item (item.id)}
            {@const Icon = item.icon}
            <button
              class="sidebar-nav-item"
              class:active={activeFilter === item.id}
              onclick={() => (activeFilter = item.id)}
              aria-label="{item.label} filter">
              <Icon class="size-[15px]" />
              <span class="flex-1 text-left">{item.label}</span>
            </button>
          {/each}
        </div>

        <div class="sidebar-divider"></div>

        <div class="dash-section-label">Quick Access</div>
        <button
          class="sidebar-nav-item"
          onclick={() => handleNewWorkspace()}
          aria-label="New workspace">
          <Sparkles class="size-[15px]" />
          <span class="flex-1 text-left">New Workspace</span>
          <ArrowUpRight class="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      </nav>

      <!-- User section -->
      <div class="sidebar-footer">
        {#if authStore.isLoggedIn && authStore.user}
          <div class="flex items-center gap-2.5">
            {#if authStore.user.avatar_url}
              <img
                src={authStore.user.avatar_url}
                alt={authStore.user.display_name || 'User'}
                class="size-8 rounded-full ring-1 ring-border" />
            {:else}
              <div class="user-avatar-badge">
                {(authStore.user.display_name || authStore.user.email || '?')[0].toUpperCase()}
              </div>
            {/if}
            <div class="min-w-0 flex-1">
              <p class="truncate text-[12px] font-medium text-foreground/80">
                {authStore.user.display_name || authStore.user.email}
              </p>
              {#if authStore.user.display_name}
                <p class="truncate text-[10px] text-muted-foreground/60">{authStore.user.email}</p>
              {/if}
            </div>
            <button
              class="sidebar-icon-btn"
              onclick={() => authStore.logout()}
              title="Sign out"
              aria-label="Sign out">
              <LogOut class="size-3.5" />
            </button>
          </div>
        {:else}
          <button class="signin-pill" onclick={() => authStore.login()}>
            <User class="size-3.5" />
            Sign in to save work
          </button>
        {/if}
      </div>
    </div>
  </aside>

  <!-- Main content -->
  <div class="dash-main">
    <!-- Mobile header -->
    <header class="mobile-header md:hidden">
      <a href={resolve('/')} class="flex items-center gap-2">
        <img src="/brand/logo.png" alt="Graphini" class="size-7 rounded-lg" />
        <span class="text-[13px] font-semibold text-foreground/90">Dashboard</span>
      </a>
      <button
        class="mobile-new-btn"
        disabled={creating}
        onclick={handleNewWorkspace}
        aria-label="New workspace">
        {#if creating}<Loader2 class="size-4 animate-spin" />{:else}<Plus class="size-4" />{/if}
      </button>
    </header>

    <!-- Mobile filters -->
    <div class="mobile-filters md:hidden">
      {#each sidebarItems as item (item.id)}
        <button
          class="mobile-filter-pill"
          class:active={activeFilter === item.id}
          onclick={() => (activeFilter = item.id)}>
          {item.label}
        </button>
      {/each}
    </div>

    <!-- Content area -->
    <div class="content-scroll">
      <div class="mx-auto max-w-[1200px]">
        {#if mounted}
          <!-- Top bar: title + search + new -->
          <div class="content-header" in:fly={{ y: 10, duration: 350, easing: cubicOut }}>
            <div class="flex items-center gap-4">
              <h1 class="content-title">
                {activeFilter === 'starred'
                  ? 'Starred'
                  : activeFilter === 'shared'
                    ? 'Shared with me'
                    : 'All Diagrams'}
              </h1>
              <span class="count-badge">{totalCount}</span>
            </div>

            <div class="flex items-center gap-3">
              <!-- Search -->
              <div class="search-wrapper" class:focused={searchFocused}>
                <Search class="search-icon" />
                <input
                  type="text"
                  placeholder="Search diagrams..."
                  class="search-input"
                  value={searchQuery}
                  oninput={handleSearchInput}
                  onfocus={() => (searchFocused = true)}
                  onblur={() => (searchFocused = false)} />
                <kbd class="search-kbd">
                  <Command class="size-2.5" />K
                </kbd>
              </div>

              <!-- New diagram button -->
              <button
                class="new-btn hidden sm:flex"
                disabled={creating}
                onclick={handleNewWorkspace}>
                {#if creating}
                  <Loader2 class="size-4 animate-spin" />
                {:else}
                  <Plus class="size-4" />
                {/if}
                <span>New Diagram</span>
              </button>
            </div>
          </div>
        {/if}

        <!-- Auth banner -->
        {#if !authStore.isLoggedIn && authStore.isInitialized}
          <div class="auth-cta" in:fade={{ duration: 300, delay: 200 }}>
            <div class="auth-cta-glow"></div>
            <div
              class="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 class="text-[14px] font-semibold text-foreground">Sign in to save your work</h3>
                <p class="mt-1 text-[12px] text-muted-foreground/70">
                  Create an account to save diagrams, star favorites, and access them from anywhere.
                </p>
              </div>
              <button class="new-btn shrink-0" onclick={() => authStore.login()}>Sign in</button>
            </div>
          </div>
        {/if}

        <!-- Loading state -->
        {#if loading}
          <div class="flex flex-1 items-center justify-center py-32">
            <div class="text-center" in:fade={{ duration: 200 }}>
              <div class="loading-spinner mx-auto"></div>
              <p class="mt-4 text-[12px] text-muted-foreground/60">Loading workspaces...</p>
            </div>
          </div>

          <!-- Populated grid -->
        {:else if workspaces.length > 0}
          <div class="card-grid">
            <!-- New diagram card -->
            <button
              class="new-card group"
              disabled={creating}
              onclick={handleNewWorkspace}
              in:scale={{ start: 0.95, duration: 300, easing: backOut }}
              aria-label="Create new workspace">
              <div class="new-card-inner">
                {#if creating}
                  <Loader2 class="size-7 animate-spin text-violet-400/80" />
                {:else}
                  <div class="new-card-icon">
                    <Plus class="size-5 text-violet-400" />
                  </div>
                {/if}
                <span class="new-card-label">New Diagram</span>
                <span class="new-card-sub">Start from scratch</span>
              </div>
            </button>

            <!-- Workspace cards -->
            {#each workspaces as ws, i (ws.id)}
              {@const Icon = typeIcons[ws.diagram_type || ''] || typeIcons.default}
              {@const style = getTypeStyle(ws.diagram_type)}
              {#if mounted}
                <div
                  class="ws-card group"
                  style="--card-accent: {style.text}; --card-glow: {style.glow}; --card-border: {style.border}"
                  in:fly={{ y: 16, duration: 350, delay: 60 + i * 35, easing: cubicOut }}>
                  <!-- Preview area -->
                  <button
                    class="ws-preview"
                    style="background: {style.bg}"
                    onclick={() => goto(resolve(`/workspace/${ws.id}`))}
                    aria-label="Open {ws.title}">
                    <div
                      class="ws-preview-icon"
                      style="background: {style.bg}; border-color: {style.border}; color: {style.text}">
                      <Icon class="size-6" />
                    </div>
                    <!-- Subtle grid pattern in preview -->
                    <div class="ws-preview-pattern"></div>
                  </button>

                  <!-- Card body -->
                  <div class="ws-body">
                    <div class="flex items-start justify-between gap-2">
                      <button class="ws-title" onclick={() => goto(resolve(`/workspace/${ws.id}`))}>
                        {ws.title}
                      </button>
                      <div
                        class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <button
                          class="ws-action-btn"
                          onclick={() => handleStar(ws)}
                          aria-label={ws.is_starred ? 'Unstar' : 'Star'}>
                          <Star
                            class="size-3.5 {ws.is_starred
                              ? 'fill-amber-400 text-amber-400'
                              : ''}" />
                        </button>
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger>
                            <button class="ws-action-btn" aria-label="More options">
                              <MoreHorizontal class="size-3.5" />
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Content align="end" class="min-w-[160px]">
                            <DropdownMenu.Item onclick={() => handleDuplicate(ws)}>
                              <Copy class="mr-2 size-3.5" />Duplicate
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item
                              class="text-destructive"
                              onclick={() => (deleteTarget = { id: ws.id, title: ws.title })}>
                              <Trash2 class="mr-2 size-3.5" />Delete
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Root>
                      </div>
                    </div>

                    <!-- Star indicator (when hovered actions hidden) -->
                    {#if ws.is_starred}
                      <Star
                        class="absolute top-4 right-4 size-3 fill-amber-400 text-amber-400 transition-opacity group-hover:opacity-0" />
                    {/if}

                    <!-- Meta row -->
                    <div class="ws-meta">
                      {#if ws.diagram_type}
                        <span
                          class="ws-type-badge"
                          style="color: {style.text}; background: {style.bg}; border-color: {style.border}">
                          {ws.diagram_type}
                        </span>
                      {/if}
                      <span class="ws-time">
                        <Clock class="size-3" />
                        {formatTime(ws.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>
              {/if}
            {/each}
          </div>

          <!-- Empty state -->
        {:else}
          <div class="empty-state" in:fade={{ duration: 350 }}>
            <div class="empty-icon-wrap">
              <Folder class="size-8 text-violet-400/50" />
            </div>
            <h3 class="mt-5 text-[15px] font-semibold text-foreground/80">
              {searchQuery ? 'No matches found' : 'No workspaces yet'}
            </h3>
            <p class="mt-2 max-w-xs text-[12px] leading-relaxed text-muted-foreground/60">
              {searchQuery
                ? 'Try a different search term or clear your filters.'
                : 'Create your first diagram to get started. Describe it in plain English or write Mermaid DSL directly.'}
            </p>
            {#if !searchQuery}
              <button class="new-btn mt-8" disabled={creating} onclick={handleNewWorkspace}>
                <Plus class="size-4" />Create your first diagram
              </button>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  @reference "../../app.css";

  /* ── Layout Shell ── */
  .dash-root {
    @apply relative flex min-h-[100dvh];
    background: var(--background);
  }

  /* ── Ambient Background ── */
  .ambient-grid {
    position: absolute;
    inset: 0;
    background-image: linear-gradient(var(--dash-grid-line) 1px, transparent 1px),
      linear-gradient(90deg, var(--dash-grid-line) 1px, transparent 1px);
    background-size: 80px 80px;
    mask-image: radial-gradient(ellipse at 30% 20%, black 0%, transparent 70%);
  }

  .ambient-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(140px);
    will-change: transform;
    animation: drift 25s ease-in-out infinite;
  }

  .ambient-orb-1 {
    width: 500px;
    height: 500px;
    top: -5%;
    left: 20%;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--gradient-from) 7%, transparent) 0%,
      transparent 70%
    );
  }

  .ambient-orb-2 {
    width: 400px;
    height: 400px;
    bottom: 10%;
    right: 15%;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--gradient-to) 5%, transparent) 0%,
      transparent 70%
    );
    animation-delay: -12s;
    animation-direction: reverse;
  }

  @keyframes drift {
    0%,
    100% {
      transform: translate(0, 0) scale(1);
    }
    33% {
      transform: translate(20px, -15px) scale(1.03);
    }
    66% {
      transform: translate(-15px, 10px) scale(0.97);
    }
  }

  /* ── Sidebar ── */
  .dash-sidebar {
    @apply hidden w-[240px] shrink-0 md:block;
    position: relative;
    z-index: 10;
    background: var(--surface-overlay);
    border-right: 1px solid var(--surface-border);
  }

  .sidebar-header {
    @apply flex items-center px-5 py-4;
    border-bottom: 1px solid var(--surface-border);
  }

  .sidebar-nav-item {
    @apply flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-all duration-200;
    @apply focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none;
    color: var(--dash-text-secondary);
    cursor: pointer;
  }
  .sidebar-nav-item:hover {
    background: var(--dash-hover-bg);
    color: var(--dash-hover-text);
  }

  .sidebar-nav-item.active {
    background: color-mix(in srgb, var(--gradient-from) 8%, transparent);
    color: var(--gradient-to);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gradient-from) 8%, transparent);
  }

  .sidebar-divider {
    @apply mx-3 my-3;
    height: 1px;
    background: var(--surface-border);
  }

  .sidebar-footer {
    @apply p-3;
    border-top: 1px solid var(--surface-border);
  }

  .user-avatar-badge {
    @apply flex size-8 items-center justify-center rounded-full text-[11px] font-semibold;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--gradient-from) 15%, transparent),
      color-mix(in srgb, var(--gradient-to) 10%, transparent)
    );
    color: var(--gradient-to);
    border: 1px solid color-mix(in srgb, var(--gradient-from) 12%, transparent);
  }

  .sidebar-icon-btn {
    @apply flex size-7 items-center justify-center rounded-md transition-all duration-200;
    @apply focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none;
    color: var(--dash-text-faint);
    cursor: pointer;
  }
  .sidebar-icon-btn:hover {
    background: var(--dash-hover-bg);
    color: var(--dash-hover-text);
  }

  .signin-pill {
    @apply flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-medium transition-all duration-200;
    @apply focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none;
    color: var(--dash-text-secondary);
    background: var(--surface-overlay);
    border: 1px solid var(--surface-border);
    cursor: pointer;
  }
  .signin-pill:hover {
    background: color-mix(in srgb, var(--gradient-from) 5%, transparent);
    border-color: color-mix(in srgb, var(--gradient-from) 15%, transparent);
    color: var(--gradient-to);
  }

  /* ── Main Content ── */
  .dash-main {
    @apply relative z-10 flex flex-1 flex-col;
  }

  .content-scroll {
    @apply flex-1 overflow-y-auto px-5 py-7 sm:px-8 md:px-10;
  }

  /* ── Mobile ── */
  .mobile-header {
    @apply flex items-center justify-between border-b px-4 py-3;
    border-color: var(--surface-border);
  }

  .mobile-new-btn {
    @apply flex size-9 items-center justify-center rounded-lg;
    color: #fff;
    background: linear-gradient(135deg, var(--gradient-from), var(--gradient-via));
    cursor: pointer;
  }

  .mobile-filters {
    @apply flex items-center gap-2 overflow-x-auto px-4 py-2;
    border-bottom: 1px solid var(--surface-border);
  }

  .mobile-filter-pill {
    @apply shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all duration-200;
    @apply focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none;
    color: var(--dash-text-secondary);
    cursor: pointer;
  }
  .mobile-filter-pill.active {
    background: color-mix(in srgb, var(--gradient-from) 10%, transparent);
    color: var(--gradient-to);
  }

  /* ── Content Header ── */
  .content-header {
    @apply mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between;
  }

  .content-title {
    @apply text-xl font-bold tracking-tight text-foreground;
    font-family: 'Space Grotesk', sans-serif;
  }

  .count-badge {
    @apply inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums;
    background: var(--surface-border);
    color: var(--dash-text-tertiary);
    min-width: 20px;
  }

  /* ── Search ── */
  .search-wrapper {
    @apply relative flex items-center;
    width: 220px;
    transition: all 200ms ease;
  }
  .search-wrapper.focused {
    width: 280px;
  }

  .search-wrapper :global(.search-icon) {
    @apply absolute left-2.5 size-3.5;
    color: var(--dash-text-faint);
    pointer-events: none;
  }

  .search-input {
    @apply w-full rounded-lg py-2 pr-12 pl-8 text-[12px] transition-all duration-200 outline-none;
    color: var(--foreground);
    background: var(--surface-overlay);
    border: 1px solid var(--surface-border);
  }
  .search-input::placeholder {
    color: var(--dash-text-faint);
  }
  .search-input:focus {
    background: var(--surface-border);
    border-color: color-mix(in srgb, var(--gradient-from) 25%, transparent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--gradient-from) 6%, transparent);
  }

  .search-kbd {
    @apply absolute right-2 flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium;
    color: var(--dash-text-faint);
    background: var(--surface-overlay);
    border: 1px solid var(--surface-border);
    pointer-events: none;
  }

  /* ── New Button ── */
  .new-btn {
    @apply inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold transition-all duration-250;
    @apply focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none;
    color: #fff;
    background: linear-gradient(
      135deg,
      var(--gradient-from) 0%,
      var(--gradient-via) 50%,
      var(--gradient-to) 100%
    );
    box-shadow:
      0 0 16px color-mix(in srgb, var(--gradient-to) 20%, transparent),
      0 2px 8px rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }
  .new-btn:hover {
    box-shadow:
      0 0 24px color-mix(in srgb, var(--gradient-to) 35%, transparent),
      0 4px 16px var(--dash-card-hover-shadow);
    transform: translateY(-1px);
  }

  /* ── Section Labels ── */
  .dash-section-label {
    @apply mb-2 px-3 text-[10px] font-semibold tracking-[0.08em] uppercase;
    color: var(--dash-text-faint);
  }

  /* ── New Card Labels ── */
  .new-card-label {
    @apply mt-3 text-[12px] font-medium transition-colors;
    color: var(--dash-text-secondary);
  }
  .new-card:hover .new-card-label {
    color: var(--dash-hover-text);
  }
  .new-card-sub {
    @apply mt-0.5 text-[10px];
    color: var(--dash-text-faint);
  }

  /* ── Auth Banner ── */
  .auth-cta {
    @apply relative mb-7 overflow-hidden rounded-xl p-5;
    background: color-mix(in srgb, var(--gradient-from) 3%, transparent);
    border: 1px solid color-mix(in srgb, var(--gradient-from) 8%, transparent);
  }

  .auth-cta-glow {
    position: absolute;
    top: -50%;
    right: -20%;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--gradient-from) 6%, transparent) 0%,
      transparent 70%
    );
    pointer-events: none;
  }

  /* ── Card Grid ── */
  .card-grid {
    @apply grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4;
  }

  /* ── New Card ── */
  .new-card {
    @apply relative flex min-h-[200px] items-center justify-center rounded-xl transition-all duration-300;
    @apply focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none;
    border: 1.5px dashed var(--surface-border);
    cursor: pointer;
  }
  .new-card:hover {
    border-color: color-mix(in srgb, var(--gradient-from) 20%, transparent);
    background: color-mix(in srgb, var(--gradient-from) 2%, transparent);
  }

  .new-card-inner {
    @apply flex flex-col items-center justify-center;
  }

  .new-card-icon {
    @apply flex size-12 items-center justify-center rounded-xl transition-all duration-300;
    background: color-mix(in srgb, var(--gradient-from) 6%, transparent);
    border: 1px solid color-mix(in srgb, var(--gradient-from) 10%, transparent);
  }
  .new-card:hover .new-card-icon {
    background: color-mix(in srgb, var(--gradient-from) 10%, transparent);
    border-color: color-mix(in srgb, var(--gradient-from) 20%, transparent);
    transform: scale(1.05);
    box-shadow: 0 0 24px color-mix(in srgb, var(--gradient-from) 10%, transparent);
  }

  /* ── Workspace Card ── */
  .ws-card {
    @apply relative flex min-h-[200px] flex-col rounded-xl transition-all duration-300;
    background: var(--surface-overlay);
    border: 1px solid var(--surface-border);
  }
  .ws-card:hover {
    border-color: var(--card-border, var(--surface-border));
    transform: translateY(-2px);
    box-shadow:
      0 8px 24px var(--dash-card-shadow),
      0 0 32px var(--card-glow, transparent);
  }

  .ws-preview {
    @apply relative flex h-[100px] w-full items-center justify-center overflow-hidden rounded-t-xl;
    border-bottom: 1px solid var(--surface-overlay);
    cursor: pointer;
  }

  .ws-preview-icon {
    @apply flex size-12 items-center justify-center rounded-xl transition-all duration-300;
    border: 1px solid;
    position: relative;
    z-index: 1;
  }
  .ws-card:hover .ws-preview-icon {
    transform: scale(1.08);
  }

  .ws-preview-pattern {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(
        circle at 20% 30%,
        var(--dash-pattern-dot) 1px,
        transparent 1px
      ),
      radial-gradient(circle at 80% 70%, var(--dash-pattern-dot-alt) 1px, transparent 1px);
    background-size:
      20px 20px,
      30px 30px;
    pointer-events: none;
  }

  .ws-body {
    @apply relative flex flex-1 flex-col p-3.5;
  }

  .ws-title {
    @apply text-left text-[12px] leading-snug font-medium transition-colors;
    @apply focus-visible:outline-none;
    color: var(--dash-text-primary);
    cursor: pointer;
  }
  .ws-title:hover,
  .ws-title:focus-visible {
    color: var(--foreground);
  }

  .ws-action-btn {
    @apply flex size-6 items-center justify-center rounded-md transition-all duration-150;
    @apply focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none;
    color: var(--dash-text-tertiary);
    cursor: pointer;
  }
  .ws-action-btn:hover {
    background: var(--dash-hover-bg);
    color: var(--dash-hover-text);
  }

  .ws-meta {
    @apply mt-auto flex items-center gap-2 pt-3;
  }

  .ws-type-badge {
    @apply rounded-md px-1.5 py-0.5 text-[9px] font-semibold tracking-wide capitalize;
    border: 1px solid;
  }

  .ws-time {
    @apply flex items-center gap-1 text-[10px];
    color: var(--dash-text-tertiary);
  }

  /* ── Empty State ── */
  .empty-state {
    @apply flex flex-col items-center justify-center py-28 text-center;
  }

  .empty-icon-wrap {
    @apply flex size-16 items-center justify-center rounded-2xl;
    background: color-mix(in srgb, var(--gradient-from) 4%, transparent);
    border: 1px solid color-mix(in srgb, var(--gradient-from) 8%, transparent);
  }

  /* ── Loading ── */
  .loading-spinner {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2.5px solid var(--surface-border);
    border-top-color: var(--gradient-from);
    animation: spin 0.8s linear infinite;
    box-shadow: 0 0 16px color-mix(in srgb, var(--gradient-from) 15%, transparent);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
