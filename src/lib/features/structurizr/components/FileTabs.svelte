<script lang="ts">
  import { cn } from '$lib/utils';
  import { Plus, X } from 'lucide-svelte';

  interface Props {
    files: Record<string, string>;
    activeFile: string;
    onSelect: (filename: string) => void;
    onCreate: (filename: string) => void;
    onDelete: (filename: string) => void;
    onRename: (oldName: string, newName: string) => void;
  }

  let { files, activeFile, onSelect, onCreate, onDelete, onRename }: Props = $props();

  // Inline new-file creation state
  let isCreating = $state(false);
  let newFileName = $state('');

  // Rename state — tracks which tab is being renamed
  let renamingFile = $state<string | null>(null);
  let renameValue = $state('');

  const PROTECTED_FILE = 'workspace.dsl';

  function ensureDslExtension(name: string): string {
    const trimmed = name.trim();
    return trimmed.endsWith('.dsl') ? trimmed : `${trimmed}.dsl`;
  }

  function isDuplicate(name: string, excludeOriginal?: string): boolean {
    const candidate = ensureDslExtension(name);
    return Object.keys(files).some((f) => f === candidate && f !== excludeOriginal);
  }

  // ---- Create ----
  function startCreating() {
    newFileName = '';
    isCreating = true;
  }

  function commitCreate() {
    const name = newFileName.trim();
    if (!name) {
      isCreating = false;
      return;
    }
    const finalName = ensureDslExtension(name);
    if (isDuplicate(finalName)) {
      // Silently ignore duplicates — user can try a different name
      return;
    }
    onCreate(finalName);
    isCreating = false;
    newFileName = '';
  }

  function cancelCreate() {
    isCreating = false;
    newFileName = '';
  }

  function handleCreateKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitCreate();
    } else if (e.key === 'Escape') {
      cancelCreate();
    }
  }

  // ---- Rename ----
  function startRenaming(filename: string) {
    if (filename === PROTECTED_FILE) return;
    renamingFile = filename;
    // Pre-fill without .dsl for easier editing
    renameValue = filename.endsWith('.dsl') ? filename.slice(0, -4) : filename;
  }

  function commitRename() {
    if (!renamingFile) return;
    const name = renameValue.trim();
    if (!name) {
      cancelRename();
      return;
    }
    const finalName = ensureDslExtension(name);
    if (isDuplicate(finalName, renamingFile)) {
      // Don't allow duplicate names
      return;
    }
    if (finalName !== renamingFile) {
      onRename(renamingFile, finalName);
    }
    renamingFile = null;
    renameValue = '';
  }

  function cancelRename() {
    renamingFile = null;
    renameValue = '';
  }

  function handleRenameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      cancelRename();
    }
  }

  function handleTabContextMenu(e: MouseEvent, filename: string) {
    e.preventDefault();
    if (filename === PROTECTED_FILE) return;
    startRenaming(filename);
  }
</script>

<div
  class="scrollbar-none flex h-8 items-stretch overflow-x-auto border-b border-border bg-background">
  {#each Object.keys(files) as filename (filename)}
    <div
      class={cn(
        'group relative flex shrink-0 cursor-pointer items-center gap-1 border-r border-border px-2.5 transition-colors',
        activeFile === filename
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      )}
      role="tab"
      tabindex="0"
      aria-selected={activeFile === filename}
      onclick={() => onSelect(filename)}
      oncontextmenu={(e) => handleTabContextMenu(e, filename)}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(filename);
        }
      }}>
      {#if renamingFile === filename}
        <!-- Inline rename input -->
        <!-- svelte-ignore a11y_autofocus -->
        <input
          class="h-5 w-24 rounded border border-border bg-background px-1 font-mono text-[11px] text-foreground outline-none focus:border-primary"
          type="text"
          autofocus
          bind:value={renameValue}
          onkeydown={handleRenameKeydown}
          onblur={commitRename}
          onclick={(e) => e.stopPropagation()} />
      {:else}
        <span class="font-mono text-[11px] leading-none">{filename}</span>
      {/if}

      <!-- Delete button (hidden on workspace.dsl) -->
      {#if filename !== PROTECTED_FILE && renamingFile !== filename}
        <button
          type="button"
          class="ml-0.5 flex size-3.5 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
          aria-label="Delete {filename}"
          onclick={(e) => {
            e.stopPropagation();
            onDelete(filename);
          }}>
          <X class="size-2.5" />
        </button>
      {/if}

      <!-- Active tab bottom indicator -->
      {#if activeFile === filename}
        <span class="absolute right-0 bottom-0 left-0 h-[2px] bg-primary/60"></span>
      {/if}
    </div>
  {/each}

  <!-- New file inline input -->
  {#if isCreating}
    <div class="flex shrink-0 items-center border-r border-border px-2">
      <!-- svelte-ignore a11y_autofocus -->
      <input
        class="h-5 w-24 rounded border border-border bg-background px-1 font-mono text-[11px] text-foreground outline-none focus:border-primary"
        type="text"
        placeholder="filename"
        autofocus
        bind:value={newFileName}
        onkeydown={handleCreateKeydown}
        onblur={commitCreate} />
    </div>
  {/if}

  <!-- Add file button -->
  <button
    type="button"
    class="flex shrink-0 items-center px-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
    aria-label="New file"
    onclick={startCreating}>
    <Plus class="size-3.5" />
  </button>
</div>
