<script lang="ts">
  import McWrapper from '$lib/components/McWrapper.svelte';
  import MermaidChartIcon from '$lib/components/MermaidChartIcon.svelte';
  import Share from '$lib/components/Share.svelte';
  import { Button } from '$lib/components/ui/button';
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
  } from '$lib/components/ui/dropdown-menu';
  import { Separator } from '$lib/components/ui/separator';
  import { Toggle } from '$lib/components/ui/toggle';
  import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
  } from '$lib/components/ui/tooltip';
  import {
    Brush,
    Download,
    Eye,
    EyeOff,
    FolderOpen,
    Grid3x3,
    HelpCircle,
    Palette,
    Settings,
    Upload
  } from '@lucide/svelte';
  import SyncRoughToolbar from './SyncRoughToolbar.svelte';
  import VersionSecurityToolbar from './VersionSecurityToolbar.svelte';

  interface Props {
    mobileToggle?: any;
    historyIcon?: any;
    isHistoryOpen: boolean;
    onHistoryToggle: (pressed: boolean) => void;
    isSidebarVisible: boolean;
    onSidebarToggle: () => void;
    saveDiagramUrl: string;
    shouldShowGrid: boolean;
    onGridToggle: () => void;
    onColorizeToggle: () => void;
    isColorizeEnabled: boolean;
  }

  let {
    mobileToggle,
    historyIcon,
    isHistoryOpen,
    onHistoryToggle,
    isSidebarVisible,
    onSidebarToggle,
    saveDiagramUrl,
    shouldShowGrid,
    onGridToggle,
    onColorizeToggle,
    isColorizeEnabled
  }: Props = $props();

  const handleHistoryToggle = (pressed: boolean) => {
    onHistoryToggle(pressed);
  };

  const handleImport = (e: MouseEvent) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.mmd,.mermaid,.json';
    input.onchange = (event) => {
      const target = event.currentTarget as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        window.dispatchEvent(new CustomEvent('import-diagram', { detail: { file } }));
      }
    };
    input.click();
  };

  const handleExport = (e: MouseEvent) => {
    window.dispatchEvent(new CustomEvent('export-diagram'));
  };

  const handleOpenFile = (e: MouseEvent) => {
    window.dispatchEvent(new CustomEvent('open-file-explorer'));
  };

  const colorPresets = [
    { name: 'Ocean', colors: ['#3b82f6', '#06b6d4', '#0ea5e9', '#22d3ee'] },
    { name: 'Sunset', colors: ['#ef4444', '#f97316', '#f59e0b', '#fbbf24'] },
    { name: 'Forest', colors: ['#10b981', '#22c55e', '#84cc16', '#34d399'] },
    { name: 'Purple', colors: ['#8b5cf6', '#a855f7', '#d946ef', '#ec4899'] },
    { name: 'Monochrome', colors: ['#374151', '#6b7280', '#9ca3af', '#d1d5db'] },
    { name: 'Rainbow', colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'] }
  ];

  let selectedColorPreset = colorPresets[0];

  const applyColorPreset = (preset: (typeof colorPresets)[0]) => {
    selectedColorPreset = preset;
    window.dispatchEvent(new CustomEvent('apply-color-preset', { detail: preset }));
  };
</script>

<TooltipProvider>
  <div
    class="flex w-full flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <!-- Left Section - Navigation & Tools -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- Mobile Toggle -->
      {#if mobileToggle}
        <div class="flex items-center gap-2 px-2">
          {mobileToggle()}
        </div>
      {/if}

      <!-- History Toggle -->
      <Tooltip>
        <TooltipTrigger>
          <Toggle size="sm" pressed={isHistoryOpen} onPressedChange={handleHistoryToggle}>
            {historyIcon?.()}
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>
          <p>Toggle History Panel</p>
        </TooltipContent>
      </Tooltip>

      <!-- Sidebar Toggle -->
      <Tooltip>
        <TooltipTrigger>
          <Button
            size="icon"
            variant="ghost"
            onclick={onSidebarToggle}
            title={isSidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
            aria-label={isSidebarVisible ? 'Hide sidebar' : 'Show sidebar'}>
            {#if isSidebarVisible}
              <EyeOff class="size-4" />
            {:else}
              <Eye class="size-4" />
            {/if}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isSidebarVisible ? 'Hide' : 'Show'} Sidebar</p>
        </TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" class="h-6" />

      <!-- Color Controls -->
      <div class="flex items-center gap-1">
        <!-- Colorize Toggle -->
        <Tooltip>
          <TooltipTrigger>
            <Toggle size="sm" pressed={isColorizeEnabled} onPressedChange={onColorizeToggle}>
              <Brush class="size-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>
            <p>Toggle Colorize Connections</p>
          </TooltipContent>
        </Tooltip>

        <!-- Color Presets Dropdown -->
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger>
              <DropdownMenuTrigger>
                <Button size="icon" variant="ghost" class="h-8 w-8">
                  <Palette class="size-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Color Presets</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" class="w-48">
            {#each colorPresets as preset}
              <DropdownMenuItem onclick={() => applyColorPreset(preset)}>
                <div class="flex w-full items-center gap-2">
                  <div class="flex gap-1">
                    {#each preset.colors.slice(0, 4) as color}
                      <div
                        class="h-3 w-3 rounded-full border border-border"
                        style="background-color: {color}">
                      </div>
                    {/each}
                  </div>
                  <span class="text-sm">{preset.name}</span>
                </div>
              </DropdownMenuItem>
            {/each}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator orientation="vertical" class="h-6" />

      <!-- Grid Toggle -->
      <Tooltip>
        <TooltipTrigger>
          <Toggle size="sm" pressed={shouldShowGrid} onPressedChange={onGridToggle}>
            <Grid3x3 class="size-4" />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>
          <p>Toggle Grid</p>
        </TooltipContent>
      </Tooltip>

      <!-- File Operations -->
      <div class="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger>
            <Button size="icon" variant="ghost" onclick={handleImport}>
              <Upload class="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Import Diagram</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <Button size="icon" variant="ghost" onclick={handleExport}>
              <Download class="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export Diagram</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <Button size="icon" variant="ghost" onclick={handleOpenFile}>
              <FolderOpen class="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>File Explorer</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" class="h-6" />

      <!-- Quick Actions -->
      <div class="flex items-center gap-1">
        <Share />
        <SyncRoughToolbar />
        <VersionSecurityToolbar />
      </div>
    </div>

    <!-- Right Section - Save & Settings -->
    <div class="flex items-center gap-2">
      <McWrapper>
        <Button variant="secondary" size="sm" href={saveDiagramUrl} target="_blank">
          <MermaidChartIcon class="mr-2 h-4 w-4" />
          Save diagram
        </Button>
      </McWrapper>

      <Tooltip>
        <TooltipTrigger>
          <Button size="icon" variant="ghost" href="/settings">
            <Settings class="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Settings</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <Button size="icon" variant="ghost" href="/help">
            <HelpCircle class="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Help</p>
        </TooltipContent>
      </Tooltip>
    </div>
  </div>
</TooltipProvider>

<style>
  /* Smooth transitions for all interactive elements */
  :global(button) {
    transition: all 0.2s ease-in-out;
  }

  /* Custom hover effects */
  :global(button:hover) {
    transform: translateY(-1px);
  }

  /* Active state */
  :global(button:active) {
    transform: translateY(0);
  }

  /* Backdrop blur support */
  @supports (backdrop-filter: blur(8px)) {
    .backdrop-blur {
      backdrop-filter: blur(8px);
    }
  }
</style>
