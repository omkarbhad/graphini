<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';
  import { workspaceStore } from '$lib/stores/workspace.svelte';
  import { cn } from '$lib/util';
  import {
    Check,
    ChevronRight,
    Edit3,
    File,
    FileCode,
    FileImage,
    FilePlus,
    FileSpreadsheet,
    FileText,
    Folder,
    FolderOpen,
    FolderPlus,
    Plus,
    RefreshCw,
    Save,
    Search,
    Trash2,
    Upload,
    UserPlus,
    Users,
    X
  } from 'lucide-svelte';
  import { onMount } from 'svelte';

  // Action to focus input when element is mounted
  function focusInput(node: HTMLInputElement) {
    node.focus();
    return {};
  }

  interface Props {
    collapsed?: boolean;
    onToggleCollapse?: () => void;
    onFileOpen?: (file: unknown) => void;
  }

  let { collapsed = false, onToggleCollapse, onFileOpen }: Props = $props();

  let projectFilesExpanded = $state(true);
  let sessionFilesExpanded = $state(true);
  let collaboratorsExpanded = $state(true);
  let selectedFileId = $state<string | null>(null);
  let searchQuery = $state('');
  let editingFileId = $state<string | null>(null);
  let editingFileName = $state('');
  let deletingFileId = $state<string | null>(null);
  let isSaving = $state(false);
  let inviteEmail = $state('');
  let showInviteInput = $state(false);
  let inviteError = $state('');
  let inviteLoading = $state(false);
  let collaborators = $state<
    Array<{
      id: string;
      user_id: string;
      role: string;
      user?: { id: string; email: string; display_name: string | null; avatar_url: string | null };
    }>
  >([]);
  let collaboratorsLoading = $state(false);

  async function loadCollaborators() {
    if (!authStore.isLoggedIn) return;
    collaboratorsLoading = true;
    try {
      const res = await fetch('/api/collaborators?workspace_id=default', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        collaborators = data.collaborators || [];
      }
    } catch {
      /* silent */
    }
    collaboratorsLoading = false;
  }

  async function inviteCollaborator() {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      inviteError = 'Enter a valid email';
      return;
    }
    inviteLoading = true;
    inviteError = '';
    try {
      const res = await fetch('/api/collaborators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: 'default',
          email: inviteEmail.trim(),
          role: 'editor'
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        collaborators = [...collaborators, data.collaborator];
        inviteEmail = '';
        showInviteInput = false;
      } else {
        inviteError = data.error || 'Failed to invite';
      }
    } catch (e: any) {
      inviteError = e?.message || 'Network error';
    }
    inviteLoading = false;
  }

  async function removeCollaborator(userId: string) {
    try {
      const res = await fetch('/api/collaborators', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: 'default', user_id: userId }),
        credentials: 'include'
      });
      if (res.ok) {
        collaborators = collaborators.filter((c) => c.user_id !== userId);
      }
    } catch {
      /* silent */
    }
  }

  async function changeRole(userId: string, newRole: string) {
    try {
      await fetch('/api/collaborators', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: 'default', user_id: userId, role: newRole }),
        credentials: 'include'
      });
      collaborators = collaborators.map((c) =>
        c.user_id === userId ? { ...c, role: newRole } : c
      );
    } catch {
      /* silent */
    }
  }

  // New file/folder creation
  let isCreating = $state(false);
  let creatingIn = $state<string | null>(null);
  let creatingType = $state<'file' | 'folder'>('file');
  let newItemName = $state('');

  // Expanded folders
  let expandedFolders = $state<Set<string>>(new Set());

  // Drag and drop
  let draggedItemId = $state<string | null>(null);
  let dropTargetId = $state<string | null>(null);

  // Reactive file list from store
  let userFiles = $derived([] as any[]);
  let currentFile = $derived(workspaceStore.workspace);

  // Build tree
  let fileTree = $derived.by(() => {
    const files = searchQuery.trim()
      ? userFiles.filter((f: any) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : userFiles;
    return [] as any[];
  });

  // Sync selectedFileId with current file
  $effect(() => {
    if (currentFile) {
      selectedFileId = currentFile.id;
    }
  });

  onMount(() => {
    // workspace handles loading
  });

  function toggleFolder(id: string) {
    const next = new Set(expandedFolders);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expandedFolders = next;
  }

  function openFile(file: any) {
    if (file.type === 'folder') {
      toggleFolder(file.id);
      return;
    }
    selectedFileId = file.id;
    onFileOpen?.(file);
  }

  function startCreating(type: 'file' | 'folder', parentId: string | null = null) {
    isCreating = true;
    creatingType = type;
    creatingIn = parentId;
    newItemName = '';
    if (parentId) {
      const next = new Set(expandedFolders);
      next.add(parentId);
      expandedFolders = next;
    }
  }

  function cancelCreate() {
    isCreating = false;
    creatingIn = null;
    newItemName = '';
  }

  async function confirmCreate() {
    if (!newItemName.trim()) {
      cancelCreate();
      return;
    }
    try {
      if (creatingType === 'folder') {
        // workspace-based: folder creation not supported
      } else {
        const name = newItemName.trim().endsWith('.mmd')
          ? newItemName.trim()
          : newItemName.trim() + '.mmd';
        const file = null /* workspace-based */;
        onFileOpen?.(file);
      }
    } catch (e) {
      console.error('Failed to create:', e);
    }
    cancelCreate();
  }

  function startEditing(file: any) {
    editingFileId = file.id;
    editingFileName = file.type === 'file' ? file.name.replace('.mmd', '') : file.name;
  }

  async function saveFileName() {
    if (!editingFileId || !editingFileName.trim()) {
      editingFileId = null;
      return;
    }
    try {
      const file = userFiles.find((f: any) => f.id === editingFileId);
      const name = file?.type === 'file' ? editingFileName.trim() + '.mmd' : editingFileName.trim();
      // workspace-based: rename via workspaceStore.updateMeta
    } catch (e) {
      console.error('Rename failed:', e);
    }
    editingFileId = null;
    editingFileName = '';
  }

  async function deleteItem(id: string) {
    try {
      // workspace-based: delete not supported from sidebar
      if (selectedFileId === id) selectedFileId = null;
    } catch (e) {
      console.error('Delete failed:', e);
    }
    deletingFileId = null;
  }

  async function handleSave() {
    isSaving = true;
    try {
      await workspaceStore.save();
    } catch {}
    isSaving = false;
  }

  function formatDate(d: string) {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return date.toLocaleDateString();
  }

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFileExt(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  async function deleteSessionFile(fileId: string) {
    try {
      const res = await fetch(`/api/files?fileId=${encodeURIComponent(fileId)}`, {
        method: 'DELETE'
      });
      if (res.ok) console.log('session file removed', fileId);
    } catch {}
  }

  // Drag handlers
  function handleDragStart(e: DragEvent, itemId: string) {
    draggedItemId = itemId;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', itemId);
    }
  }

  function handleDragOver(e: DragEvent, targetId: string | null) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    dropTargetId = targetId;
  }

  function handleDragLeave() {
    dropTargetId = null;
  }

  async function handleDrop(e: DragEvent, targetId: string | null) {
    e.preventDefault();
    dropTargetId = null;
    if (!draggedItemId || draggedItemId === targetId) {
      draggedItemId = null;
      return;
    }
    let newParentId = targetId;
    if (targetId) {
      const target = userFiles.find((f: any) => f.id === targetId);
      if (target && target.type === 'file') {
        newParentId = target.parentId;
      }
    }
    // workspace-based: move not supported
    draggedItemId = null;
  }

  function handleDragEnd() {
    draggedItemId = null;
    dropTargetId = null;
  }
</script>

<div
  class={cn(
    'flex h-full flex-col border-r border-b border-l border-border/40 bg-card transition-all duration-300',
    collapsed ? 'w-14' : 'w-full'
  )}>
  <!-- Search Bar -->
  {#if !collapsed}
    <div class="border-b border-border/20 px-3.5 py-3">
      <div class="relative">
        <Search
          class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40" />
        <input
          type="text"
          placeholder="Search files..."
          bind:value={searchQuery}
          class="h-10 w-full rounded-xl border border-border/30 bg-muted/20 pr-3 pl-10 text-sm transition-colors placeholder:text-muted-foreground/40 focus:border-border/50 focus:bg-background focus:ring-1 focus:ring-ring/20 focus:outline-none" />
      </div>
    </div>
  {/if}

  <div class="scrollbar-thin flex-1 overflow-y-auto">
    <!-- Files Section -->
    <div>
      <div class="flex items-center gap-2 px-3.5 py-3">
        <Folder class="size-4 text-muted-foreground/60" />
        {#if !collapsed}
          <button
            type="button"
            class="flex flex-1 items-center text-left"
            onclick={() => (projectFilesExpanded = !projectFilesExpanded)}>
            <span
              class="flex-1 text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase"
              >Files</span>
          </button>
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
            title="New File"
            onclick={(e) => {
              e.stopPropagation();
              startCreating('file');
            }}>
            <Plus class="size-4" />
          </button>
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
            title="New Folder"
            onclick={(e) => {
              e.stopPropagation();
              startCreating('folder');
            }}>
            <FolderPlus class="size-3.5" />
          </button>
          <button
            type="button"
            class="flex size-6 items-center justify-center"
            onclick={() => (projectFilesExpanded = !projectFilesExpanded)}>
            <ChevronRight
              class={cn(
                'size-3.5 text-muted-foreground/60 transition-transform',
                projectFilesExpanded && 'rotate-90'
              )} />
          </button>
        {/if}
      </div>

      {#if !collapsed && projectFilesExpanded}
        <!-- New item input -->
        {#if isCreating && creatingIn === null}
          <div class="animate-in fade-in-0 slide-in-from-top-1 duration-150 flex items-center gap-1.5 px-3.5 py-1.5">
            {#if creatingType === 'folder'}
              <Folder class="size-4 text-amber-500/70" />
            {:else}
              <FileCode class="size-4 text-muted-foreground" />
            {/if}
            <input
              type="text"
              bind:value={newItemName}
              placeholder={creatingType === 'folder' ? 'folder name' : 'filename.mmd'}
              class="h-8 flex-1 rounded-md border border-input bg-background px-2.5 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
              onkeydown={(e) => {
                if (e.key === 'Enter') confirmCreate();
                if (e.key === 'Escape') cancelCreate();
              }} />
            <button
              type="button"
              class="flex size-7 items-center justify-center rounded-md text-primary hover:bg-primary/10"
              onclick={confirmCreate}>
              <Check class="size-3" />
            </button>
            <button
              type="button"
              class="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/30"
              onclick={cancelCreate}>
              <X class="size-3" />
            </button>
          </div>
        {/if}

        <!-- File tree -->
        <div
          class="space-y-1 px-1.5 pb-2"
          role="tree"
          tabindex="0"
          ondragover={(e) => handleDragOver(e, null)}
          ondrop={(e) => handleDrop(e, null)}
          ondragleave={handleDragLeave}>
          {#if fileTree.length === 0 && !isCreating}
            <div class="px-3 py-4 text-center">
              <FileCode class="mx-auto mb-2 size-5 text-muted-foreground/40" />
              <p class="text-[11px] text-muted-foreground/50">No files yet</p>
              <button
                type="button"
                class="mt-1 text-[10px] font-medium text-primary"
                onclick={() => startCreating('file')}>
                Create one
              </button>
            </div>
          {:else}
            {#each fileTree as node (node.item.id)}
              {@render treeItem(node, 0)}
            {/each}
          {/if}
        </div>
      {/if}
    </div>

    <!-- Session Files Section (uploaded via chat) -->
    {#if ([] as any[]).length > 0 || false}
      <div class="border-t border-border/20 py-2">
        <div class="flex items-center gap-2 px-3.5 py-3">
          <Upload class="size-4 text-muted-foreground/60" />
          {#if !collapsed}
            <button
              type="button"
              class="flex flex-1 items-center text-left"
              onclick={() => (sessionFilesExpanded = !sessionFilesExpanded)}>
              <span
                class="flex-1 text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase">
                Uploads
                {#if ([] as any[]).length > 0}
                  <span
                    class="ml-1 inline-flex size-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                    {([] as any[]).length}
                  </span>
                {/if}
              </span>
            </button>
            <button
              type="button"
              class="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              title="Refresh"
              onclick={(e) => {
                e.stopPropagation();
                // workspace-based: no session files
              }}>
              <RefreshCw class={cn('size-3', false && 'animate-spin')} />
            </button>
            <button
              type="button"
              class="flex size-6 items-center justify-center"
              onclick={() => (sessionFilesExpanded = !sessionFilesExpanded)}>
              <ChevronRight
                class={cn(
                  'size-3.5 text-muted-foreground/60 transition-transform',
                  sessionFilesExpanded && 'rotate-90'
                )} />
            </button>
          {/if}
        </div>

        {#if !collapsed && sessionFilesExpanded}
          <div class="space-y-0.5 px-2 pb-2">
            {#if false && ([] as any[]).length === 0}
              <div class="flex items-center justify-center py-3">
                <span
                  class="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
                ></span>
              </div>
            {:else}
              {#each ([] as any[]) as sFile (sFile.id)}
                {@const ext = getFileExt(sFile.filename)}
                <div
                  class="group flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-muted/20">
                  <!-- File type icon -->
                  <div
                    class="flex size-8 flex-shrink-0 items-center justify-center rounded-lg {sFile.type ===
                    'image'
                      ? 'bg-violet-500/10'
                      : ext === 'csv' || ext === 'xlsx'
                        ? 'bg-emerald-500/10'
                        : sFile.type === 'pdf'
                          ? 'bg-red-500/10'
                          : 'bg-blue-500/10'}">
                    {#if sFile.type === 'image'}
                      <FileImage class="size-4 text-violet-500" />
                    {:else if ext === 'csv' || ext === 'xlsx' || ext === 'xls'}
                      <FileSpreadsheet class="size-4 text-emerald-500" />
                    {:else if sFile.type === 'pdf'}
                      <FileText class="size-4 text-red-500" />
                    {:else}
                      <File class="size-4 text-blue-500" />
                    {/if}
                  </div>
                  <!-- File info -->
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-xs font-medium text-foreground">{sFile.filename}</div>
                    <div class="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span>{formatFileSize(sFile.size)}</span>
                      {#if sFile.hasText}
                        <span class="size-1 rounded-full bg-emerald-500"></span>
                        <span class="text-emerald-600 dark:text-emerald-400">Parsed</span>
                      {/if}
                    </div>
                  </div>
                  <!-- Delete button -->
                  <button
                    type="button"
                    class="flex size-6 items-center justify-center rounded-md text-muted-foreground/0 transition-colors group-hover:text-muted-foreground hover:!bg-red-500/10 hover:!text-red-500"
                    title="Remove file"
                    onclick={() => deleteSessionFile(sFile.id)}>
                    <Trash2 class="size-3" />
                  </button>
                </div>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Collaborators Section -->
    <div class="border-t border-border/20 py-2">
      <div
        role="button"
        tabindex="0"
        class="flex w-full items-center gap-2 px-3.5 py-3 text-left transition-colors hover:bg-muted/20"
        onclick={() => (collaboratorsExpanded = !collaboratorsExpanded)}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            collaboratorsExpanded = !collaboratorsExpanded;
          }
        }}>
        <Users class="size-4 text-muted-foreground/60" />
        {#if !collapsed}
          <span class="flex-1 text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase"
            >Collaborators</span>
          <button
            type="button"
            class="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
            title="Invite"
            onclick={(e) => {
              e.stopPropagation();
              showInviteInput = true;
            }}>
            <UserPlus class="size-3" />
          </button>
          <ChevronRight
            class={cn(
              'size-3 text-muted-foreground transition-transform',
              collaboratorsExpanded && 'rotate-90'
            )} />
        {/if}
      </div>

      {#if !collapsed && collaboratorsExpanded}
        <!-- Invite input -->
        {#if showInviteInput}
          <div class="px-3 py-2">
            <div class="flex items-center gap-1.5">
              <input
                type="email"
                bind:value={inviteEmail}
                placeholder="colleague@email.com"
                disabled={inviteLoading}
                class="h-8 flex-1 rounded-lg border border-border/50 bg-muted/30 px-2.5 text-xs transition-colors placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-background focus:ring-1 focus:ring-ring/20 focus:outline-none"
                onkeydown={(e) => {
                  if (e.key === 'Enter') inviteCollaborator();
                  if (e.key === 'Escape') {
                    showInviteInput = false;
                    inviteEmail = '';
                    inviteError = '';
                  }
                }} />
              <button
                type="button"
                disabled={inviteLoading}
                class="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                title="Send invite"
                onclick={inviteCollaborator}>
                {#if inviteLoading}
                  <span
                    class="size-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
                  ></span>
                {:else}
                  <Check class="size-3.5" />
                {/if}
              </button>
              <button
                type="button"
                class="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                title="Cancel"
                onclick={() => {
                  showInviteInput = false;
                  inviteEmail = '';
                  inviteError = '';
                }}>
                <X class="size-3.5" />
              </button>
            </div>
            {#if inviteError}
              <p class="mt-1.5 text-[10px] text-red-500">{inviteError}</p>
            {/if}
          </div>
        {/if}

        <div class="space-y-1.5 px-3 py-2">
          {#if authStore.isLoggedIn}
            <!-- Current user (owner) -->
            <div
              class="flex items-center gap-2.5 rounded-lg bg-primary/5 px-2.5 py-2 ring-1 ring-primary/10">
              <div
                class="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-violet-600 text-[10px] font-bold text-white shadow-sm">
                {getInitials(authStore.user?.display_name || authStore.user?.email || 'U')}
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-xs font-medium text-foreground">
                  {authStore.user?.display_name || 'You'}
                </div>
                <div class="truncate text-[10px] text-muted-foreground">
                  {authStore.user?.email}
                </div>
              </div>
              <span
                class="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400"
                >Owner</span>
            </div>

            <!-- Collaborator list -->
            {#if collaboratorsLoading}
              <div class="flex items-center justify-center py-3">
                <span
                  class="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
                ></span>
              </div>
            {:else if collaborators.length > 0}
              {#each collaborators as collab (collab.id)}
                <div
                  class="group flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-muted/20">
                  <div
                    class="flex size-8 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                    {getInitials(collab.user?.display_name || collab.user?.email || '?')}
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-xs font-medium text-foreground">
                      {collab.user?.display_name || collab.user?.email || 'Unknown'}
                    </div>
                    <div class="truncate text-[10px] text-muted-foreground">
                      {collab.user?.email || ''}
                    </div>
                  </div>
                  <!-- Role badge (clickable to cycle) -->
                  <button
                    type="button"
                    class="rounded-full px-2 py-0.5 text-[9px] font-semibold transition-colors
                      {collab.role === 'admin'
                      ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400'
                      : collab.role === 'editor'
                        ? 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'}"
                    title="Click to change role"
                    onclick={() => {
                      const roles = ['viewer', 'editor', 'admin'];
                      const idx = roles.indexOf(collab.role);
                      const next = roles[(idx + 1) % roles.length];
                      changeRole(collab.user_id, next);
                    }}>
                    {collab.role}
                  </button>
                  <!-- Remove button -->
                  <button
                    type="button"
                    class="flex size-6 items-center justify-center rounded-md text-muted-foreground/0 transition-colors group-hover:text-muted-foreground hover:!bg-red-500/10 hover:!text-red-500"
                    title="Remove collaborator"
                    onclick={() => removeCollaborator(collab.user_id)}>
                    <X class="size-3" />
                  </button>
                </div>
              {/each}
            {/if}
          {:else}
            <div class="px-2 py-4 text-center">
              <div
                class="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-muted/50">
                <Users class="size-5 text-muted-foreground" />
              </div>
              <p class="text-[11px] font-medium text-muted-foreground">Sign in to collaborate</p>
              <p class="mt-0.5 text-[10px] text-muted-foreground/60">
                Invite others to edit together
              </p>
            </div>
          {/if}

          <!-- Invite button -->
          {#if authStore.isLoggedIn && !showInviteInput}
            <button
              type="button"
              class="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/50 px-2.5 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              onclick={() => {
                showInviteInput = true;
                loadCollaborators();
              }}>
              <UserPlus class="size-3.5" />
              Invite collaborator
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Footer -->
  {#if !collapsed}
    <div class="flex items-center justify-between border-t border-border/20 px-3.5 py-3 transition-all duration-200">
      {#if false /* workspace handles errors */}
        <!-- Error state -->
        <div class="flex items-center gap-2 min-w-0">
          <div class="size-2 shrink-0 rounded-full bg-red-500"></div>
          <span class="truncate text-[11px] text-red-500/90">{'Save failed'}</span>
        </div>
        <button
          type="button"
          class="shrink-0 text-[11px] font-medium text-primary hover:underline"
          onclick={() => workspaceStore.save()}>
          Retry
        </button>
      {:else if workspaceStore.isSaving}
        <!-- Saving state -->
        <div class="flex items-center gap-2">
          <span class="size-3 animate-spin rounded-full border-[1.5px] border-muted-foreground/20 border-t-muted-foreground/60"></span>
          <span class="text-[11px] text-muted-foreground/60">Saving...</span>
        </div>
      {:else if workspaceStore.isDirty}
        <!-- Pending state -->
        <div class="flex items-center gap-2">
          <div class="size-2 animate-pulse rounded-full bg-amber-500"></div>
          <span class="text-[11px] text-muted-foreground/60">Unsaved changes</span>
        </div>
        <button
          type="button"
          class="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          onclick={handleSave}
          disabled={isSaving}>
          Save
        </button>
      {:else}
        <!-- Synced state -->
        <div class="flex items-center gap-2">
          <div class="size-1.5 rounded-full bg-emerald-500/80"></div>
          <span class="text-[11px] text-muted-foreground/40">Synced</span>
        </div>
      {/if}
    </div>
  {/if}
</div>

{#snippet treeItem(node: any, depth: number)}
  {@const item = node.item}
  {@const isFolder = item.type === 'folder'}
  {@const isExpanded = expandedFolders.has(item.id)}
  {@const isActive = selectedFileId === item.id && !isFolder}
  {@const isDropTarget = dropTargetId === item.id}
  {@const isDragging = draggedItemId === item.id}
  {@const indent = depth * 16}

  <div
    class={cn('group relative', isDragging && 'opacity-60')}
    role="treeitem"
    aria-selected={isActive}
    tabindex="0"
    draggable="true"
    ondragstart={(e) => handleDragStart(e, item.id)}
    ondragover={(e) => handleDragOver(e, item.id)}
    ondragleave={handleDragLeave}
    ondrop={(e) => handleDrop(e, item.id)}
    ondragend={handleDragEnd}>
    {#if editingFileId === item.id}
      <!-- Vercel-style inline rename -->
      <div
        class="flex w-full items-center gap-2.5 rounded-md bg-primary/5 px-2.5 py-2 ring-1 ring-primary/30"
        style="padding-left: {indent + 10}px">
        {#if isFolder}
          <FolderOpen class="size-4 flex-shrink-0 text-amber-500/80" />
        {:else}
          <FileCode class="size-4 flex-shrink-0 text-primary" />
        {/if}
        <input
          type="text"
          bind:value={editingFileName}
          class="h-6 min-w-0 flex-1 rounded-sm border-0 bg-transparent px-0 text-sm font-medium text-foreground caret-primary focus:ring-0 focus:outline-none"
          onkeydown={(e) => {
            if (e.key === 'Enter') saveFileName();
            if (e.key === 'Escape') editingFileId = null;
          }}
          onblur={() => saveFileName()}
          use:focusInput />
        <span class="text-[10px] text-muted-foreground/60">{isFolder ? '' : '.mmd'}</span>
      </div>
    {:else if deletingFileId === item.id}
      <!-- Delete confirm -->
      <div
        class="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-2 py-1.5"
        style="margin-left: {indent}px">
        <span class="flex-1 text-[10px] text-destructive">Delete "{item.name}"?</span>
        <button
          type="button"
          class="flex size-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
          onclick={() => deleteItem(item.id)}>
          <Check class="size-3.5" />
        </button>
        <button
          type="button"
          class="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/30"
          onclick={() => (deletingFileId = null)}>
          <X class="size-3.5" />
        </button>
      </div>
    {:else}
      <!-- Normal item -->
      <button
        type="button"
        class={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-colors',
          isActive ? 'bg-primary/8 text-foreground font-medium' : 'hover:bg-muted/20',
          isDropTarget && isFolder && 'ring-1 ring-primary/30 bg-primary/5'
        )}
        style="padding-left: {indent + 10}px"
        onclick={() => openFile(item)}
        ondblclick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startEditing(item);
        }}>
        {#if isFolder}
          <ChevronRight
            class={cn(
              'size-3.5 flex-shrink-0 text-muted-foreground/60 transition-transform',
              isExpanded && 'rotate-90'
            )} />
          {#if isExpanded}
            <FolderOpen class="size-4 flex-shrink-0 text-amber-500" />
          {:else}
            <Folder class="size-4 flex-shrink-0 text-amber-500/60" />
          {/if}
        {:else}
          <FileCode
            class={cn(
              'size-4 flex-shrink-0',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )} />
        {/if}
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium text-foreground">
            {item.type === 'file' ? item.name.replace(/\.mmd$/, '') : item.name}
          </div>
          {#if !isFolder}
            <div class="text-[10px] text-muted-foreground/40">
              {formatDate(item.updatedAt)}
            </div>
          {/if}
        </div>
      </button>
      <!-- Hover actions -->
      <div
        class="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {#if isFolder}
          <button
            type="button"
            class="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/30 hover:text-foreground"
            title="New file in folder"
            onclick={(e) => {
              e.stopPropagation();
              startCreating('file', item.id);
            }}>
            <FilePlus class="size-3" />
          </button>
          <button
            type="button"
            class="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/30 hover:text-foreground"
            title="New subfolder"
            onclick={(e) => {
              e.stopPropagation();
              startCreating('folder', item.id);
            }}>
            <FolderPlus class="size-3" />
          </button>
        {/if}
        <button
          type="button"
          class="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/30 hover:text-foreground"
          title="Rename"
          onclick={() => startEditing(item)}>
          <Edit3 class="size-3" />
        </button>
        <button
          type="button"
          class="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/30 hover:text-destructive"
          title="Delete"
          onclick={() => {
            deletingFileId = item.id;
          }}>
          <Trash2 class="size-3" />
        </button>
      </div>
    {/if}
  </div>

  <!-- Children (if folder and expanded) -->
  {#if isFolder && isExpanded}
    <!-- Create input inside folder -->
    {#if isCreating && creatingIn === item.id}
      <div class="animate-in fade-in-0 slide-in-from-top-1 duration-150 flex items-center gap-1.5 px-3 py-1.5" style="padding-left: {indent + 24}px">
        {#if creatingType === 'folder'}
          <Folder class="size-4 text-amber-500/70" />
        {:else}
          <FileCode class="size-4 text-muted-foreground" />
        {/if}
        <input
          type="text"
          bind:value={newItemName}
          placeholder={creatingType === 'folder' ? 'folder name' : 'filename.mmd'}
          class="h-6 flex-1 rounded border border-input bg-background px-2 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
          onkeydown={(e) => {
            if (e.key === 'Enter') confirmCreate();
            if (e.key === 'Escape') cancelCreate();
          }} />
        <button
          type="button"
          class="flex size-7 items-center justify-center rounded-md text-primary hover:bg-primary/10"
          onclick={confirmCreate}>
          <Check class="size-3" />
        </button>
        <button
          type="button"
          class="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/30"
          onclick={cancelCreate}>
          <X class="size-3" />
        </button>
      </div>
    {/if}

    {#each node.children as child (child.item.id)}
      {@render treeItem(child, depth + 1)}
    {/each}

    {#if node.children.length === 0 && !(isCreating && creatingIn === item.id)}
      <div class="py-1 text-[10px] text-muted-foreground/40" style="padding-left: {indent + 28}px">
        Empty folder
      </div>
    {/if}
  {/if}
{/snippet}
