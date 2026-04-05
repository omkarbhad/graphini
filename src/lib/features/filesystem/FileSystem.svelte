<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { autosaveStore } from '$lib/stores/autosave';
  import { fileSystemStore, type UserFile } from '$lib/stores/fileSystem';
  import { onMount } from 'svelte';
  import PlusIcon from '~icons/material-symbols/add-rounded';
  import CheckIcon from '~icons/material-symbols/check-rounded';
  import CloseIcon from '~icons/material-symbols/close-rounded';
  import DeleteIcon from '~icons/material-symbols/delete-outline-rounded';
  import FileIcon from '~icons/material-symbols/description-outline-rounded';
  import EditIcon from '~icons/material-symbols/edit-outline-rounded';
  import FolderIcon from '~icons/material-symbols/folder-outline-rounded';
  import HistoryIcon from '~icons/material-symbols/history-rounded';
  import SaveIcon from '~icons/material-symbols/save-rounded';

  export let isOpen = false;
  export let onFileOpen: (file: UserFile) => void;

  let newFileName = '';
  let showNewFileInput = false;
  let selectedFileId: string | null = null;
  let fileVersions: any[] = [];
  let showVersionHistory = false;
  let isSaving = false;
  let editingFileId: string | null = null;
  let editingFileName = '';
  let deletingFileId: string | null = null;

  $: userFiles = $fileSystemStore.files;
  $: selectedFile = userFiles.find((f) => f.id === selectedFileId);

  onMount(() => {
    loadUserFiles();
  });

  async function loadUserFiles() {
    try {
      await fileSystemStore.loadUserFiles();
    } catch (error) {
      console.error('Failed to load user files:', error);
    }
  }

  async function createNewFile() {
    if (!newFileName.trim()) return;

    try {
      const newFile = await fileSystemStore.createFile(newFileName.trim());
      newFileName = '';
      showNewFileInput = false;
      // Auto-open the new file
      onFileOpen(newFile);
    } catch (error) {
      console.error('Failed to create file:', error);
    }
  }

  async function saveCurrentFile() {
    if (!selectedFileId) return;

    isSaving = true;
    try {
      await autosaveStore.saveNow();
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      isSaving = false;
    }
  }

  async function deleteFile(fileId: string) {
    try {
      await fileSystemStore.deleteFile(fileId);
      if (selectedFileId === fileId) {
        selectedFileId = null;
        showVersionHistory = false;
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  }

  async function openFile(file: UserFile) {
    selectedFileId = file.id;
    onFileOpen(file);

    // Load file versions
    try {
      fileVersions = await fileSystemStore.getFileVersions(file.id);
    } catch (error) {
      console.error('Failed to load file versions:', error);
      fileVersions = [];
    }
  }

  async function loadFileVersion(versionId: string) {
    if (!selectedFile) return;

    try {
      const versionContent = await fileSystemStore.getFileVersion(selectedFile.id, versionId);
      onFileOpen({ ...selectedFile, content: versionContent });
    } catch (error) {
      console.error('Failed to load file version:', error);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  function toggleVersionHistory(fileId: string) {
    if (selectedFileId === fileId && showVersionHistory) {
      showVersionHistory = false;
    } else {
      selectedFileId = fileId;
      showVersionHistory = true;
      const file = userFiles.find((f) => f.id === fileId);
      if (file) {
        openFile(file);
      }
    }
  }

  function startEditingFile(file: UserFile) {
    editingFileId = file.id;
    editingFileName = file.name.replace('.mmd', '');
  }

  async function saveFileName() {
    if (!editingFileId || !editingFileName.trim()) {
      cancelEditing();
      return;
    }

    try {
      const newFilename = editingFileName.trim() + '.mmd';
      await fileSystemStore.renameFile(editingFileId, newFilename);
      editingFileId = null;
      editingFileName = '';
    } catch (error) {
      console.error('Failed to rename file:', error);
    }
  }

  function cancelEditing() {
    editingFileId = null;
    editingFileName = '';
  }

  function startDeletingFile(fileId: string) {
    deletingFileId = fileId;
  }

  function cancelDeleting() {
    deletingFileId = null;
  }

  function confirmDelete(fileId: string) {
    deleteFile(fileId);
    deletingFileId = null;
  }
</script>

<!-- File System Sidebar -->
<div
  class="fixed top-20 bottom-24 left-4 z-30 w-80 transform rounded-xl border border-border bg-card shadow-xl transition-transform duration-300 md:w-96 lg:w-[24rem] {isOpen
    ? 'translate-x-0'
    : '-translate-x-[200%]'}">
  <!-- Header -->
  <div class="flex items-center justify-between border-b border-border p-4">
    <h2 class="text-lg font-semibold text-foreground">My Files</h2>
    <div class="flex gap-2">
      {#if selectedFileId && $autosaveStore.pendingChanges}
        <Button size="sm" onclick={saveCurrentFile} disabled={isSaving} class="gap-2">
          <SaveIcon class="size-4" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      {/if}
      <Button size="sm" onclick={() => (showNewFileInput = true)} class="gap-2">
        <PlusIcon class="size-4" />
        New File
      </Button>
    </div>
  </div>

  <!-- New File Input -->
  {#if showNewFileInput}
    <div class="border-b border-border bg-muted/30 p-4">
      <div class="flex gap-2">
        <Input
          bind:value={newFileName}
          placeholder="File name..."
          class="flex-1"
          onkeydown={(e) => {
            if (e.key === 'Enter') createNewFile();
            if (e.key === 'Escape') showNewFileInput = false;
          }} />
        <Button size="sm" onclick={createNewFile} disabled={!newFileName.trim()}>
          <CheckIcon class="size-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onclick={() => {
            showNewFileInput = false;
            newFileName = '';
          }}>
          <CloseIcon class="size-4" />
        </Button>
      </div>
    </div>
  {/if}

  <!-- File List -->
  <div class="flex-1 overflow-y-auto p-4">
    {#if userFiles.length === 0}
      <div class="py-8 text-center text-muted-foreground">
        <FolderIcon class="mx-auto mb-4 size-12 opacity-50" />
        <p>No files yet</p>
        <p class="text-sm">Create your first diagram to get started</p>
      </div>
    {:else}
      <div class="space-y-2">
        {#each userFiles as file (file.id)}
          <div
            class="group relative rounded-lg border border-border bg-background transition-colors hover:bg-muted/50 {selectedFileId ===
            file.id
              ? 'border-primary ring-2 ring-primary'
              : ''}">
            <!-- File Info -->
            <div class="flex items-center gap-3 p-3">
              <FileIcon class="size-5 flex-shrink-0 text-muted-foreground" />
              <div class="min-w-0 flex-1">
                {#if editingFileId === file.id}
                  <div class="flex gap-2">
                    <Input
                      bind:value={editingFileName}
                      class="h-6 flex-1 text-sm"
                      onkeydown={(e) => {
                        if (e.key === 'Enter') saveFileName();
                        if (e.key === 'Escape') cancelEditing();
                      }} />
                    <Button size="icon" variant="ghost" class="size-6" onclick={saveFileName}>
                      <CheckIcon class="size-3" />
                    </Button>
                    <Button size="icon" variant="ghost" class="size-6" onclick={cancelEditing}>
                      <CloseIcon class="size-3" />
                    </Button>
                  </div>
                {:else}
                  <h3 class="truncate font-medium text-foreground">{file.name}</h3>
                  <p class="text-xs text-muted-foreground">
                    {formatDate(file.updatedAt)} • {file.content?.length || 0} chars
                  </p>
                {/if}
              </div>
            </div>

            <!-- Action Buttons -->
            <div
              class="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {#if editingFileId !== file.id}
                <Button
                  size="icon"
                  variant="ghost"
                  class="size-8"
                  onclick={() => startEditingFile(file)}
                  title="Rename File">
                  <EditIcon class="size-4" />
                </Button>
              {/if}
              <Button
                size="icon"
                variant="ghost"
                class="size-8"
                onclick={() => toggleVersionHistory(file.id)}
                title="Version History">
                <HistoryIcon class="size-4" />
              </Button>
              {#if deletingFileId === file.id}
                <div class="flex gap-1 rounded bg-destructive/10 p-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    class="size-6 text-destructive hover:bg-destructive/20"
                    onclick={() => confirmDelete(file.id)}
                    title="Confirm delete">
                    <CheckIcon class="size-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    class="size-6"
                    onclick={cancelDeleting}
                    title="Cancel delete">
                    <CloseIcon class="size-3" />
                  </Button>
                </div>
              {:else}
                <Button
                  size="icon"
                  variant="ghost"
                  class="size-8"
                  onclick={() => startDeletingFile(file.id)}
                  title="Delete File">
                  <DeleteIcon class="size-4" />
                </Button>
              {/if}
            </div>

            <!-- Click to open file (when not editing) -->
            {#if editingFileId !== file.id}
              <div
                class="absolute inset-0 cursor-pointer"
                role="button"
                tabindex="0"
                onclick={() => openFile(file)}
                onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && openFile(file)}>
              </div>
            {/if}
          </div>

          <!-- Version History -->
          {#if selectedFileId === file.id && showVersionHistory}
            <div class="mt-2 ml-8 space-y-1 border-l-2 border-border pl-4">
              <h4 class="mb-2 text-sm font-medium text-muted-foreground">Version History</h4>
              {#if fileVersions.length === 0}
                <p class="text-xs text-muted-foreground">No versions available</p>
              {:else}
                {#each fileVersions as version (version.id)}
                  <div
                    class="flex cursor-pointer items-center justify-between rounded p-2 text-xs hover:bg-muted/30"
                    role="button"
                    tabindex="0"
                    onclick={() => loadFileVersion(version.id)}
                    onkeydown={(e) => e.key === 'Enter' && loadFileVersion(version.id)}>
                    <div>
                      <span class="font-medium">v{version.version}</span>
                      <span class="ml-2 text-muted-foreground"
                        >{formatDate(version.createdAt)}</span>
                    </div>
                    <span class="text-muted-foreground">{version.content?.length || 0} chars</span>
                  </div>
                {/each}
              {/if}
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Backdrop for mobile -->
{#if isOpen}
  <div
    class="fixed inset-0 z-20 bg-black/20 lg:hidden"
    role="button"
    aria-label="Close file sidebar"
    tabindex="0"
    onclick={() => (isOpen = false)}
    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (isOpen = false)}>
  </div>
{/if}
