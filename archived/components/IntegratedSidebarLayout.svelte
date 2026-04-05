<script>
  import ColorSidebar from '$lib/components/ColorSidebar.svelte';
  import FilesSidebar from '$lib/components/FilesSidebar.svelte';
  import IconSidebar from '$lib/components/IconSidebar.svelte';
  import { Button } from '$lib/components/ui/button';
  import UnifiedToolbar from '$lib/components/UnifiedToolbar.svelte';
  import { cn } from '$lib/utils';
  import { ChevronLeft, ChevronRight, X } from '@lucide/svelte';

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
    children: any;
    historyPanel?: any;
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
    children,
    historyPanel
  }: Props = $props();

  let activeSidebar = $state<'none' | 'icon' | 'color' | 'files'>('none');
  let sidebarPosition = $state<'left' | 'right'>('left');
  let width = 0;
  let isMobile = $derived(width < 640);

  const handleSidebarChange = (sidebar: 'none' | 'icon' | 'color' | 'files') => {
    activeSidebar = sidebar;
  };

  const toggleSidebarPosition = () => {
    sidebarPosition = sidebarPosition === 'left' ? 'right' : 'left';
  };

  const closeAllSidebars = () => {
    activeSidebar = 'none';
  };

  const layoutClasses = $derived(
    cn('flex h-screen bg-background', sidebarPosition === 'left' ? 'flex-row' : 'flex-row-reverse')
  );

  const mainContentClasses = $derived(
    cn('flex flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out')
  );

  const getSidebarWidth = $derived(() => {
    switch (activeSidebar) {
      case 'icon':
        return isMobile ? 64 : 256;
      case 'color':
        return isMobile ? 64 : 320;
      case 'files':
        return isMobile ? 64 : 320;
      default:
        return 0;
    }
  });

  const getSidebarComponent = $derived(() => {
    switch (activeSidebar) {
      case 'icon':
        return IconSidebar;
      case 'color':
        return ColorSidebar;
      case 'files':
        return FilesSidebar;
      default:
        return null;
    }
  });

  // Listen for specific sidebar open events
  $effect(() => {
    const handleIconSidebarOpen = () => {
      activeSidebar = 'icon';
    };

    const handleColorSidebarOpen = () => {
      activeSidebar = 'color';
    };

    window.addEventListener('open-icon-sidebar', handleIconSidebarOpen);
    window.addEventListener('open-color-sidebar', handleColorSidebarOpen);

    return () => {
      window.removeEventListener('open-icon-sidebar', handleIconSidebarOpen);
      window.removeEventListener('open-color-sidebar', handleColorSidebarOpen);
    };
  });
</script>

<div class={layoutClasses} bind:clientWidth={width}>
  <!-- Active Sidebar -->
  {#if activeSidebar !== 'none' && getSidebarComponent()}
    <div
      class="flex-shrink-0 transition-all duration-300 ease-in-out"
      style="width: {getSidebarWidth()}px">
      {#if activeSidebar === 'icon'}
        <IconSidebar collapsed={isMobile} position={sidebarPosition} />
      {:else if activeSidebar === 'color'}
        <ColorSidebar collapsed={isMobile} position={sidebarPosition} />
      {:else if activeSidebar === 'files'}
        <FilesSidebar collapsed={isMobile} position={sidebarPosition} />
      {/if}
    </div>
  {/if}

  <!-- Main Content Area -->
  <main class={mainContentClasses}>
    <!-- Unified Toolbar -->
    <UnifiedToolbar
      {mobileToggle}
      {historyIcon}
      {isHistoryOpen}
      {onHistoryToggle}
      {isSidebarVisible}
      {onSidebarToggle}
      {saveDiagramUrl}
      {shouldShowGrid}
      {onGridToggle}
      {onColorizeToggle}
      {isColorizeEnabled}
      {activeSidebar}
      onSidebarChange={handleSidebarChange} />

    <!-- Page Content -->
    <div class="flex flex-1 overflow-hidden">
      <slot />
    </div>

    <!-- Floating Sidebar Controls (for desktop) -->
    {#if !isMobile}
      <div
        class="fixed bottom-4 {sidebarPosition === 'left'
          ? 'left-4'
          : 'right-4'} z-50 flex flex-col gap-2">
        <!-- Sidebar Position Toggle -->
        <Button
          size="icon"
          variant="outline"
          class="border-border bg-background/80 shadow-lg backdrop-blur-sm"
          onclick={toggleSidebarPosition}
          title="Toggle sidebar position">
          {#if sidebarPosition === 'left'}
            <ChevronRight class="h-4 w-4" />
          {:else}
            <ChevronLeft class="h-4 w-4" />
          {/if}
        </Button>

        <!-- Close All Sidebars -->
        {#if activeSidebar !== 'none'}
          <Button
            size="icon"
            variant="outline"
            class="border-border bg-background/80 shadow-lg backdrop-blur-sm"
            onclick={closeAllSidebars}
            title="Close all sidebars">
            <X class="h-4 w-4" />
          </Button>
        {/if}
      </div>
    {/if}
  </main>

  <!-- History Panel (if active) -->
  {#if isHistoryOpen && historyPanel}
    <div class="w-80 flex-shrink-0 border-l border-border bg-background">
      <slot />
    </div>
  {/if}
</div>

<style>
  /* Responsive behavior */
  @media (max-width: 640px) {
    /* Mobile sidebar adjustments */
    .main-content {
      margin: 0 !important;
    }
  }

  /* Smooth scrollbar */
  main > div:last-child {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--muted)) transparent;
  }

  main > div:last-child::-webkit-scrollbar {
    width: 6px;
  }

  main > div:last-child::-webkit-scrollbar-track {
    background: transparent;
  }

  main > div:last-child::-webkit-scrollbar-thumb {
    background-color: hsl(var(--muted));
    border-radius: 3px;
  }

  main > div:last-child::-webkit-scrollbar-thumb:hover {
    background-color: hsl(var(--muted-foreground));
  }

  /* Floating controls animation */
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .fixed {
    animation: slideUp 0.3s ease-out;
  }

  /* Backdrop blur support */
  @supports (backdrop-filter: blur(8px)) {
    .backdrop-blur-sm {
      backdrop-filter: blur(4px);
    }
  }
</style>
