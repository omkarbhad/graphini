<script lang="ts">
  import { fileSystemStore } from '$/stores/fileSystem';
  import { Button } from '$lib/components/ui/button';
  import { stateStore } from '$lib/util/state';
  import type { Snippet } from 'svelte';
  import FileIcon from '~icons/material-symbols/description-rounded';
  import FolderIcon from '~icons/material-symbols/folder-rounded';
  import HistoryIcon from '~icons/material-symbols/history';

  interface Props {
    isHistoryOpen?: boolean;
    onHistoryToggle?: (pressed: boolean) => void;
    onFileSystemToggle?: () => void;
    children?: Snippet;
  }

  let { isHistoryOpen = false, onHistoryToggle, onFileSystemToggle, children }: Props = $props();

  // Get current file info from file system store
  const currentFile = $derived($fileSystemStore.currentFile);
  const displayFilename = $derived(currentFile?.name || 'untitled.mmd');

  // Generate filename from current code or use default
  const generateFilename = () => {
    const code = $stateStore.code || '';
    if (code.trim()) {
      // Try to extract a title from the code
      const titleMatch = code.match(/title:\s*["'`]([^"'`]+)["'`]/i);
      if (titleMatch) {
        return `${titleMatch[1].replace(/[^a-zA-Z0-9]/g, '_')}.mmd`;
      }
      // Fallback to generic name
      return `diagram_${Date.now().toString(36)}.mmd`;
    }
    return 'untitled.mmd';
  };

  const currentFilename = $derived(currentFile ? currentFile.name : generateFilename());

  const handleHistoryToggle = () => {
    if (onHistoryToggle) {
      onHistoryToggle(!isHistoryOpen);
    }
  };

  // Handle filename editing
  let isEditingFilename = $state(false);
  let editingFilename = $state('');

  const startEditingFilename = () => {
    editingFilename = currentFilename.replace('.mmd', '');
    isEditingFilename = true;
  };

  const saveFilename = async () => {
    const newFilename = editingFilename.trim() || 'untitled';
    const fullFilename = newFilename.endsWith('.mmd') ? newFilename : `${newFilename}.mmd`;

    // Update file system store with new filename
    if (currentFile) {
      // Update existing file name
      fileSystemStore.updateFileName(currentFile.id, fullFilename);
    } else {
      // Create new file with this name, then update content
      const newFile = await fileSystemStore.createFile(fullFilename);
      if ($stateStore.code) {
        await fileSystemStore.updateFile(newFile.id, $stateStore.code);
      }
    }

    isEditingFilename = false;
  };

  const cancelEditing = () => {
    isEditingFilename = false;
    editingFilename = '';
  };
</script>

<div
  class="pointer-events-auto fixed top-4 left-4 z-50 flex items-center gap-1 rounded-xl border border-border bg-gradient-to-r from-card/80 to-card/60 px-2 py-1.5 backdrop-blur-lg transition-all duration-300 hover:border-border hover:bg-card/90 hover:shadow-lg supports-[backdrop-filter]:bg-card/70">
  <!-- Enhanced Logo -->
  <div class="group relative">
    <div
      class="absolute inset-0 scale-0 rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-100">
    </div>
    <img
      src="/brand/logo.png"
      alt="Graphini"
      class="relative size-5 transition-transform duration-300 group-hover:scale-110" />
  </div>

  <!-- Enhanced Separator -->
  <div class="h-4 w-px bg-gradient-to-b from-transparent via-border/60 to-transparent"></div>

  <!-- Enhanced File System Section -->
  <div class="flex items-center gap-1">
    <!-- Enhanced File System Toggle Button -->
    <Button
      variant="ghost"
      size="icon"
      onclick={onFileSystemToggle || (() => {})}
      class="h-7 w-7 rounded-lg text-muted-foreground/70 transition-all duration-300 hover:scale-105 hover:bg-primary/10 hover:text-primary"
      title="Toggle File System">
      <FolderIcon
        class="pointer-events-none size-3.5 transition-transform duration-300 group-hover:scale-110" />
    </Button>

    <!-- Enhanced Editable Filename Display -->
    {#if isEditingFilename}
      <div class="group relative">
        <input
          type="text"
          bind:value={editingFilename}
          onkeydown={(e) => {
            if (e.key === 'Enter') {
              saveFilename();
            } else if (e.key === 'Escape') {
              cancelEditing();
            }
          }}
          onblur={saveFilename}
          class="flex max-w-48 rounded-lg border border-primary/50 bg-background/80 px-2 py-1 font-mono text-xs text-foreground backdrop-blur-sm transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
          placeholder="filename" />
        <div
          class="absolute -right-0.5 -bottom-0.5 flex gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            onclick={saveFilename}
            class="flex h-5 w-5 items-center justify-center rounded-lg bg-green-500 text-white transition-colors hover:bg-green-600"
            title="Save">
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M5 13l4 4L19 7"></path>
            </svg>
          </button>
          <button
            onclick={cancelEditing}
            class="flex h-5 w-5 items-center justify-center rounded-lg bg-red-500 text-white transition-colors hover:bg-red-600"
            title="Cancel">
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    {:else}
      <div
        class="group relative flex max-w-48 cursor-pointer items-center gap-1.5 truncate rounded-lg px-1.5 py-0.5 font-mono text-xs text-muted-foreground/80 transition-all duration-300 hover:bg-muted/50 hover:text-foreground"
        onclick={startEditingFilename}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === 'Enter' && startEditingFilename()}
        title="Click to edit filename">
        <FileIcon
          class="pointer-events-none size-3.5 text-primary/60 transition-colors duration-300 group-hover:text-primary" />
        <span
          class="truncate transition-colors duration-300 group-hover:text-foreground"
          title={displayFilename}>{displayFilename}</span>
        <div
          class="pointer-events-none absolute inset-0 rounded-lg bg-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        </div>
      </div>
    {/if}
  </div>

  <!-- Enhanced Separator -->
  <div class="h-4 w-px bg-gradient-to-b from-transparent via-border/60 to-transparent"></div>

  <!-- Enhanced Actions Section -->
  <div class="flex items-center gap-1">
    <!-- Enhanced History Toggle -->
    <Button
      variant="ghost"
      size="icon"
      onclick={handleHistoryToggle}
      class="h-7 w-7 rounded-lg text-muted-foreground/70 transition-all duration-300 hover:scale-105 hover:bg-primary/10 hover:text-primary {isHistoryOpen
        ? 'bg-primary/10 text-primary shadow-sm'
        : ''}"
      title="Toggle History">
      <HistoryIcon
        class="size-3.5 transition-transform duration-300 {isHistoryOpen
          ? 'scale-110'
          : ''} pointer-events-none group-hover:scale-110" />
    </Button>

    <!-- Enhanced Share Button -->
    <Button
      variant="ghost"
      size="icon"
      class="h-7 w-7 rounded-lg text-muted-foreground/70 transition-all duration-300 hover:scale-105 hover:bg-primary/10 hover:text-primary"
      title="Share">
      <div class="relative">
        <svg
          class="pointer-events-none size-3.5 transition-transform duration-300 group-hover:scale-110"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
          ></path>
        </svg>
      </div>
    </Button>
  </div>

  <!-- Enhanced Additional Actions -->
  {#if children}
    <div class="flex items-center gap-1">
      <div class="h-4 w-px bg-gradient-to-b from-transparent via-border/40 to-transparent"></div>
      <div class="group relative">
        {@render children()}
      </div>
    </div>
  {/if}
</div>
