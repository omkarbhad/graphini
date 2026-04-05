<script lang="ts">
  import McWrapper from '$lib/components/McWrapper.svelte';
  import MermaidChartIcon from '$lib/components/MermaidChartIcon.svelte';
  import Share from '$lib/components/Share.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import { Toggle } from '$lib/components/ui/toggle';
  import {
    Brush,
    Download,
    Eye,
    EyeOff,
    FileText,
    FolderOpen,
    Grid3x3,
    HelpCircle,
    Menu,
    Palette,
    Settings
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
    activeSidebar: 'none' | 'icon' | 'color' | 'files';
    onSidebarChange: (sidebar: 'none' | 'icon' | 'color' | 'files') => void;
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
    isColorizeEnabled,
    activeSidebar,
    onSidebarChange
  }: Props = $props();

  const handleHistoryToggle = (pressed: boolean) => {
    onHistoryToggle(pressed);
  };

  const toggleIconSidebar = () => {
    onSidebarChange(activeSidebar === 'icon' ? 'none' : 'icon');
  };

  const toggleColorSidebar = () => {
    onSidebarChange(activeSidebar === 'color' ? 'none' : 'color');
  };

  const toggleFilesSidebar = () => {
    onSidebarChange(activeSidebar === 'files' ? 'none' : 'files');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.mmd,.mermaid,.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        window.dispatchEvent(new CustomEvent('import-diagram', { detail: { file } }));
      }
    };
    input.click();
  };

  const handleExport = () => {
    window.dispatchEvent(new CustomEvent('export-diagram'));
  };
</script>

<div
  class="flex w-full flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
  <!-- Left Section - Navigation & Tools -->
  <div class="flex flex-wrap items-center gap-2">
    <!-- Mobile Toggle -->
    {#if mobileToggle}
      <div class="flex items-center gap-2 px-2">
        {#if mobileToggle}
          {mobileToggle()}
        {/if}
      </div>
    {/if}

    <!-- History Toggle -->
    <Toggle size="sm" pressed={isHistoryOpen} onPressedChange={handleHistoryToggle}>
      {#if historyIcon}
        {historyIcon()}
      {/if}
    </Toggle>

    <!-- Main Sidebar Toggle -->
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

    <Separator orientation="vertical" class="h-6" />

    <!-- Sidebar Selection -->
    <div class="flex items-center gap-1">
      <!-- Icon Sidebar -->
      <Button
        size="icon"
        variant={activeSidebar === 'icon' ? 'default' : 'ghost'}
        onclick={toggleIconSidebar}
        title="Toggle Icon Sidebar">
        <Menu class="size-4" />
      </Button>

      <!-- Color Sidebar -->
      <Button
        size="icon"
        variant={activeSidebar === 'color' ? 'default' : 'ghost'}
        onclick={toggleColorSidebar}
        title="Toggle Color Sidebar">
        <Palette class="size-4" />
      </Button>

      <!-- Files Sidebar -->
      <Button
        size="icon"
        variant={activeSidebar === 'files' ? 'default' : 'ghost'}
        onclick={toggleFilesSidebar}
        title="Toggle Files Sidebar">
        <FolderOpen class="size-4" />
      </Button>
    </div>

    <Separator orientation="vertical" class="h-6" />

    <!-- Quick Color Controls -->
    <div class="flex items-center gap-1">
      <!-- Colorize Toggle -->
      <Toggle
        size="sm"
        pressed={isColorizeEnabled}
        onPressedChange={onColorizeToggle}
        title="Toggle Colorize Connections">
        <Brush class="size-4" />
      </Toggle>

      <!-- Grid Toggle -->
      <Toggle size="sm" pressed={shouldShowGrid} onPressedChange={onGridToggle} title="Toggle Grid">
        <Grid3x3 class="size-4" />
      </Toggle>
    </div>

    <Separator orientation="vertical" class="h-6" />

    <!-- Quick File Operations -->
    <div class="flex items-center gap-1">
      <Button size="icon" variant="ghost" onclick={handleImport} title="Import Diagram">
        <FileText class="size-4" />
      </Button>

      <Button size="icon" variant="ghost" onclick={handleExport} title="Export Diagram">
        <Download class="size-4" />
      </Button>
    </div>

    <Separator orientation="vertical" class="h-6" />

    <!-- Existing Tools -->
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

    <Button size="icon" variant="ghost" href="/settings" title="Settings">
      <Settings class="size-4" />
    </Button>

    <Button size="icon" variant="ghost" href="/help" title="Help">
      <HelpCircle class="size-4" />
    </Button>
  </div>
</div>

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
