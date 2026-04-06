<script lang="ts">
  import { page } from '$app/stores';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
  } from '$lib/components/ui/tooltip';
  import { cn } from '$lib/util';
  import { BarChart3, FileText, Menu, Palette, Settings, Upload, X } from '@lucide/svelte';

  let {
    collapsed = false,
    position = 'left',
    onToggle
  }: {
    collapsed?: boolean;
    position?: 'left' | 'right';
    onToggle?: () => void;
  } = $props();

  const toggleCollapsed = () => {
    collapsed = !collapsed;
    onToggle?.();
  };

  const navigationItems = [
    {
      title: 'Editor',
      icon: FileText,
      href: '/dashboard',
      description: 'Open diagram editor'
    },
    {
      title: 'History',
      icon: BarChart3,
      href: '/history',
      description: 'View diagram history'
    },
    {
      title: 'Templates',
      icon: Palette,
      href: '/templates',
      description: 'Browse templates'
    },
    {
      title: 'Share',
      icon: Upload,
      href: '/share',
      description: 'Share diagrams'
    }
  ];

  const actionItems = [
    {
      title: 'Import',
      icon: Upload,
      action: 'import',
      description: 'Import diagram'
    },
    {
      title: 'Export',
      icon: FileText,
      action: 'export',
      description: 'Export diagram'
    },
    {
      title: 'Settings',
      icon: Settings,
      href: '/settings',
      description: 'Application settings'
    },
    {
      title: 'Help',
      icon: FileText,
      href: '/help',
      description: 'Get help'
    }
  ];

  const handleAction = (action: string) => {
    if (action === 'import') {
      // Trigger import dialog
      document.getElementById('file-input')?.click();
    } else if (action === 'export') {
      // Trigger export functionality
      window.dispatchEvent(new CustomEvent('export-diagram'));
    }
  };

  const handleActionClick = (action: string) => () => {
    handleAction(action);
  };

  const isActive = (href: string) => {
    return $page.url.pathname === href;
  };

  const sidebarClasses = $derived(
    cn(
      'flex flex-col h-full bg-background border-border transition-all duration-300 ease-in-out z-40',
      collapsed ? 'w-16' : 'w-64',
      position === 'left' ? 'border-r' : 'border-l border-l-0 border-r',
      'shadow-lg'
    )
  );

  const getItemClasses = (href?: string, active?: boolean) =>
    cn(
      'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
      'hover:bg-accent hover:text-accent-foreground',
      active && 'bg-accent text-accent-foreground',
      collapsed ? 'justify-center' : 'justify-start'
    );
</script>

<TooltipProvider>
  <div class={sidebarClasses}>
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-border p-4">
      {#if !collapsed}
        <h2 class="text-lg font-semibold text-foreground">Navigation</h2>
      {/if}
      <Button
        variant="ghost"
        size="sm"
        class="h-8 w-8 p-0"
        onclick={toggleCollapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        {#if collapsed}
          <Menu class="h-4 w-4" />
        {:else}
          <X class="h-4 w-4" />
        {/if}
      </Button>
    </div>

    <!-- Navigation Items -->
    <nav class="flex-1 space-y-2 p-4">
      {#each navigationItems as item (item.title)}
        <Tooltip delayDuration={collapsed ? 0 : Infinity}>
          <TooltipTrigger>
            <a
              href={item.href}
              class={getItemClasses(item.href, isActive(item.href))}
              aria-label={item.title}>
              <item.icon class="h-5 w-5 flex-shrink-0" />
              {#if !collapsed}
                <span class="truncate">{item.title}</span>
              {/if}
            </a>
          </TooltipTrigger>
          {#if collapsed}
            <TooltipContent side={position === 'left' ? 'right' : 'left'}>
              <p>{item.title}</p>
            </TooltipContent>
          {/if}
        </Tooltip>
      {/each}
    </nav>

    <Separator />

    <!-- Action Items -->
    <div class="space-y-2 p-4">
      {#each actionItems as item (item.title)}
        <Tooltip delayDuration={collapsed ? 0 : Infinity}>
          <TooltipTrigger>
            {#if item.action}
              <button
                class={getItemClasses()}
                onclick={() => handleActionClick(item.action || '')}
                aria-label={item.title || ''}>
                >
                <item.icon class="h-5 w-5 flex-shrink-0" />
                {#if !collapsed}
                  <span class="truncate">{item.title}</span>
                {/if}
              </button>
            {:else}
              <a
                href={item.href}
                class={getItemClasses(item.href, item.href ? isActive(item.href) : false)}
                aria-label={item.title || ''}>
                >
                <item.icon class="h-5 w-5 flex-shrink-0" />
                {#if !collapsed}
                  <span class="truncate">{item.title}</span>
                {/if}
              </a>
            {/if}
          </TooltipTrigger>
          {#if collapsed}
            <TooltipContent side={position === 'left' ? 'right' : 'left'}>
              <p>{item.title}</p>
            </TooltipContent>
          {/if}
        </Tooltip>
      {/each}
    </div>

    <!-- Hidden file input for import -->
    <input
      id="file-input"
      type="file"
      accept=".mmd,.mermaid,.json"
      class="hidden"
      onchange={(e) => {
        const target = e.currentTarget;
        if (!target?.files) return;

        const file = target.files[0];
        if (file) {
          window.dispatchEvent(new CustomEvent('import-diagram', { detail: { file } }));
        }
      }} />
  </div>
</TooltipProvider>

<style>
  /* Custom animations for smooth transitions */
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

  nav a {
    animation: slideIn 0.2s ease-out;
  }

  /* Hover effects */
  nav a:hover {
    transform: translateX(2px);
  }

  /* Active state styling */
  nav a[class*='bg-accent'] {
    font-weight: 500;
    box-shadow: inset 0 0 0 1px hsl(var(--accent));
  }
</style>
