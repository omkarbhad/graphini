<script>
  import IconSidebar from '$lib/components/IconSidebar.svelte';
  import { Button } from '$lib/components/ui/button';
  import { cn } from '$lib/utils';
  import { Menu } from '@lucide/svelte';

  interface Props {
    sidebarCollapsed?: boolean;
    sidebarPosition?: 'left' | 'right';
  }

  let { sidebarCollapsed = false, sidebarPosition = 'left' }: Props = $props();

  const toggleSidebar = (e: MouseEvent) => {
    sidebarCollapsed = !sidebarCollapsed;
  };

  $: layoutClasses = cn(
    'flex h-screen bg-background',
    sidebarPosition === 'left' ? 'flex-row' : 'flex-row-reverse'
  );

  $: mainClasses = cn(
    'flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out',
    sidebarCollapsed ? 'ml-0' : sidebarPosition === 'left' ? 'ml-0' : 'mr-0'
  );
</script>

<div class={layoutClasses}>
  <!-- Icon Sidebar -->
  <IconSidebar
    collapsed={sidebarCollapsed}
    onToggle={() => {
      sidebarCollapsed = !sidebarCollapsed;
    }}
    position={sidebarPosition} />

  <!-- Main Content Area -->
  <main class={mainClasses}>
    <!-- Mobile Menu Toggle -->
    <div class="flex items-center justify-between border-b border-border p-4 lg:hidden">
      <h1 class="text-xl font-semibold">Mermaid Editor</h1>
      <Button
        variant="ghost"
        size="sm"
        class="h-8 w-8 p-0"
        onclick={toggleSidebar}
        aria-label="Toggle sidebar">
        <Menu class="h-4 w-4" />
      </Button>
    </div>

    <!-- Page Content -->
    <div class="flex-1 overflow-auto">
      <slot />
    </div>
  </main>
</div>

<style>
  /* Responsive behavior */
  @media (max-width: 1024px) {
    /* Hide sidebar on mobile by default */
    :global(.sidebar-mobile-hidden) {
      transform: translateX(-100%);
    }

    :global(.sidebar-mobile-hidden.right) {
      transform: translateX(100%);
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
</style>
