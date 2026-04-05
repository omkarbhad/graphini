<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
  } from '$lib/components/ui/tooltip';
  import { cn } from '$lib/utils';
  import {
    Clock,
    Download,
    FilePlus,
    FileText,
    Folder,
    FolderOpen,
    FolderPlus,
    HardDrive,
    Search,
    Star,
    Trash2,
    Upload
  } from '@lucide/svelte';

  interface Props {
    collapsed?: boolean;
    position?: 'left' | 'right';
  }

  let { collapsed = false, position = 'left' }: Props = $props();

  interface FileItem {
    id: string;
    name: string;
    type: 'file' | 'folder';
    size?: string;
    modified: string;
    starred?: boolean;
    path?: string;
    children?: FileItem[];
  }

  const recentFiles: FileItem[] = [
    {
      id: '1',
      name: 'flowchart.mmd',
      type: 'file',
      size: '2.4 KB',
      modified: '2 hours ago',
      starred: true
    },
    {
      id: '2',
      name: 'sequence-diagram.mmd',
      type: 'file',
      size: '1.8 KB',
      modified: '1 day ago',
      starred: false
    },
    {
      id: '3',
      name: 'architecture.mmd',
      type: 'file',
      size: '3.2 KB',
      modified: '3 days ago',
      starred: true
    },
    {
      id: '4',
      name: 'user-journey.mmd',
      type: 'file',
      size: '2.1 KB',
      modified: '1 week ago',
      starred: false
    }
  ];

  const folders: FileItem[] = [
    {
      id: 'f1',
      name: 'Projects',
      type: 'folder',
      modified: 'Today',
      children: [
        { id: 'f1-1', name: 'web-app.mmd', type: 'file', size: '4.2 KB', modified: 'Yesterday' },
        { id: 'f1-2', name: 'api-design.mmd', type: 'file', size: '2.8 KB', modified: '2 days ago' }
      ]
    },
    {
      id: 'f2',
      name: 'Templates',
      type: 'folder',
      modified: 'This week',
      children: [
        {
          id: 'f2-1',
          name: 'flowchart-template.mmd',
          type: 'file',
          size: '1.2 KB',
          modified: '1 week ago'
        },
        {
          id: 'f2-2',
          name: 'sequence-template.mmd',
          type: 'file',
          size: '1.5 KB',
          modified: '1 week ago'
        }
      ]
    },
    { id: 'f3', name: 'Archived', type: 'folder', modified: 'Last month' }
  ];

  let expandedFolders = $state<Set<string>>(new Set());
  let selectedFile = $state<string | null>(null);
  let searchQuery = $state('');

  const toggleFolder = (folderId: string) => {
    if (expandedFolders.has(folderId)) {
      expandedFolders.delete(folderId);
    } else {
      expandedFolders.add(folderId);
    }
    expandedFolders = new Set(expandedFolders);
  };

  const selectFile = (fileId: string) => {
    selectedFile = fileId;
    window.dispatchEvent(new CustomEvent('select-file', { detail: { fileId } }));
  };

  const toggleStar = (fileId: string) => {
    const file = recentFiles.find((f) => f.id === fileId);
    if (file) {
      file.starred = !file.starred;
    }
  };

  const deleteFile = (fileId: string) => {
    window.dispatchEvent(new CustomEvent('delete-file', { detail: { fileId } }));
  };

  const createNewFile = () => {
    window.dispatchEvent(new CustomEvent('create-new-file'));
  };

  const createNewFolder = () => {
    window.dispatchEvent(new CustomEvent('create-new-folder'));
  };

  const importFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.mmd,.mermaid,.json';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      window.dispatchEvent(new CustomEvent('import-files', { detail: { files } }));
    };
    input.click();
  };

  const exportFile = (fileId: string) => {
    window.dispatchEvent(new CustomEvent('export-file', { detail: { fileId } }));
  };

  const filteredRecentFiles = $derived(
    recentFiles.filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sidebarClasses = $derived(
    cn(
      'flex flex-col h-full bg-background border-border transition-all duration-300 ease-in-out z-40',
      collapsed ? 'w-16' : 'w-80',
      position === 'left' ? 'border-r' : 'border-l border-l-0 border-r',
      'shadow-lg'
    )
  );
</script>

<TooltipProvider>
  <div class={sidebarClasses}>
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-border p-4">
      {#if !collapsed}
        <div class="flex items-center gap-2">
          <FolderOpen class="h-5 w-5 text-primary" />
          <h2 class="text-lg font-semibold text-foreground">File Explorer</h2>
        </div>
      {/if}
      {#if collapsed}
        <FolderOpen class="mx-auto h-5 w-5 text-primary" />
      {/if}
    </div>

    <!-- File Operations -->
    <div class="space-y-2 p-4">
      {#if !collapsed}
        <div class="flex gap-2">
          <Button size="sm" variant="outline" class="flex-1" onclick={createNewFile}>
            <FilePlus class="mr-1 h-4 w-4" />
            File
          </Button>
          <Button size="sm" variant="outline" class="flex-1" onclick={createNewFolder}>
            <FolderPlus class="mr-1 h-4 w-4" />
            Folder
          </Button>
        </div>
      {/if}

      {#if collapsed}
        <div class="flex flex-col gap-2">
          <Tooltip>
            <TooltipTrigger>
              <Button size="icon" variant="outline" onclick={createNewFile}>
                <FilePlus class="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={position === 'left' ? 'right' : 'left'}>
              <p>New File</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger>
              <Button size="icon" variant="outline" onclick={createNewFolder}>
                <FolderPlus class="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={position === 'left' ? 'right' : 'left'}>
              <p>New Folder</p>
            </TooltipContent>
          </Tooltip>
        </div>
      {/if}

      <Tooltip>
        <TooltipTrigger>
          <Button
            variant="outline"
            size={collapsed ? 'icon' : 'sm'}
            class="w-full"
            onclick={importFile}>
            <Upload class="h-4 w-4" />
            {!collapsed && 'Import'}
          </Button>
        </TooltipTrigger>
        <TooltipContent side={position === 'left' ? 'right' : 'left'}>
          <p>Import Files</p>
        </TooltipContent>
      </Tooltip>
    </div>

    <Separator />

    <!-- Search -->
    {#if !collapsed}
      <div class="p-4">
        <div class="relative">
          <Search
            class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
          <input
            type="text"
            placeholder="Search files..."
            bind:value={searchQuery}
            class="w-full rounded-md border border-border bg-background py-2 pr-4 pl-10 text-sm focus:border-transparent focus:ring-2 focus:ring-primary focus:outline-none" />
        </div>
      </div>
    {/if}

    <!-- File Tree -->
    <div class="flex-1 overflow-auto">
      <!-- Folders Section -->
      {#if !collapsed}
        <div class="space-y-2 p-4">
          <h3 class="text-sm font-semibold text-muted-foreground">Folders</h3>
          {#each folders as folder}
            <div class="space-y-1">
              <div
                class="flex cursor-pointer items-center gap-2 rounded-md p-2 transition-colors hover:bg-accent"
                role="button"
                tabindex="0"
                aria-label={`Toggle folder ${folder.name}`}
                onclick={() => toggleFolder(folder.id)}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleFolder(folder.id);
                  }
                }}>
                {#if expandedFolders.has(folder.id)}
                  <FolderOpen class="h-4 w-4" />
                {:else}
                  <Folder class="h-4 w-4" />
                {/if}
                <span class="text-sm">{folder.name}</span>
              </div>

              {#if expandedFolders.has(folder.id) && folder.children}
                <div class="ml-4 space-y-1">
                  {#each folder.children as child}
                    <div
                      class="flex cursor-pointer items-center gap-2 rounded-md p-2 transition-colors hover:bg-accent {selectedFile ===
                      child.id
                        ? 'bg-accent'
                        : ''}"
                      onclick={() => selectFile(child.id)}>
                      <FileText class="h-4 w-4" />
                      <span class="text-sm">{child.name}</span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      <!-- Recent Files Section -->
      <div class="space-y-2 p-4">
        {#if !collapsed}
          <h3 class="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Clock class="h-4 w-4" />
            Recent Files
          </h3>
        {/if}

        {#each filteredRecentFiles as file}
          <div
            class="group relative cursor-pointer rounded-md p-2 transition-colors hover:bg-accent {selectedFile ===
            file.id
              ? 'bg-accent'
              : ''}"
            role="button"
            tabindex="0"
            aria-label={`Select file ${file.name}`}
            onclick={() => selectFile(file.id)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectFile(file.id);
              }
            }}>
            <div class="flex items-center gap-2">
              <FileText class="h-4 w-4 flex-shrink-0" />
              {#if !collapsed}
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="truncate text-sm">{file.name}</span>
                    {#if file.starred}
                      <Star class="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    {/if}
                  </div>
                  <div class="text-xs text-muted-foreground">
                    {file.size} • {file.modified}
                  </div>
                </div>
              {/if}
            </div>

            {#if !collapsed}
              <div
                class="absolute top-1 right-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      size="icon"
                      variant="ghost"
                      class="h-6 w-6"
                      onclick={() => toggleStar(file.id)}>
                      <Star class="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle Star</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      size="icon"
                      variant="ghost"
                      class="h-6 w-6"
                      onclick={() => exportFile(file.id)}>
                      <Download class="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Export</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      size="icon"
                      variant="ghost"
                      class="h-6 w-6"
                      onclick={() => deleteFile(file.id)}>
                      <Trash2 class="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- Storage Info -->
    {#if !collapsed}
      <div class="border-t border-border p-4">
        <div class="space-y-2">
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <HardDrive class="h-4 w-4" />
            <span>Storage</span>
          </div>
          <div class="h-2 w-full rounded-full bg-muted">
            <div class="h-2 rounded-full bg-primary" style="width: 35%"></div>
          </div>
          <div class="text-xs text-muted-foreground">3.5 MB of 10 MB used</div>
        </div>
      </div>
    {/if}
  </div>
</TooltipProvider>

<style>
  /* File tree animations */
  .file-tree-enter {
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* File item hover effects */
  .file-item:hover {
    background-color: hsl(var(--accent));
    transition: background-color 0.2s ease;
  }

  /* Storage bar animation */
  .storage-bar {
    transition: width 0.3s ease;
  }
</style>
