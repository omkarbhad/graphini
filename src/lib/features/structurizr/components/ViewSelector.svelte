<script lang="ts">
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { cn } from '$lib/utils';
  import { ChevronDown, Layers } from 'lucide-svelte';

  interface ViewItem {
    key: string;
    title: string;
    type: string;
  }

  interface Props {
    views: ViewItem[];
    activeViewKey: string;
    onSelect: (key: string) => void;
  }

  let { views, activeViewKey, onSelect }: Props = $props();

  const activeView = $derived(views.find((v) => v.key === activeViewKey));

  /** Human-readable label for a C4 view type */
  function typeLabel(type: string): string {
    switch (type) {
      case 'systemLandscape':
        return 'Landscape';
      case 'systemContext':
        return 'Context';
      case 'container':
        return 'Container';
      case 'component':
        return 'Component';
      case 'dynamic':
        return 'Dynamic';
      case 'deployment':
        return 'Deployment';
      default:
        return type;
    }
  }

  /** Badge colour per view type */
  function typeBadgeClass(type: string): string {
    switch (type) {
      case 'systemLandscape':
        return 'bg-violet-500/15 text-violet-600 dark:text-violet-400';
      case 'systemContext':
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400';
      case 'container':
        return 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400';
      case 'component':
        return 'bg-teal-500/15 text-teal-600 dark:text-teal-400';
      case 'dynamic':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
      case 'deployment':
        return 'bg-orange-500/15 text-orange-600 dark:text-orange-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  }
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger
    class={cn(
      'flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted focus:outline-none',
      views.length === 0 && 'cursor-default opacity-60'
    )}
    disabled={views.length === 0}>
    <Layers class="size-3.5 shrink-0 text-muted-foreground" />
    <span class="max-w-[140px] truncate">
      {activeView ? activeView.title || activeView.key : 'Select view'}
    </span>
    <ChevronDown class="size-3 shrink-0 text-muted-foreground" />
  </DropdownMenu.Trigger>

  <DropdownMenu.Content align="start" class="min-w-[200px]">
    {#if views.length === 0}
      <div class="px-3 py-2 text-[11px] text-muted-foreground">No views defined in DSL</div>
    {:else}
      {#each views as view (view.key)}
        <DropdownMenu.Item
          class={cn(
            'flex cursor-pointer items-center gap-2 text-[11px]',
            activeViewKey === view.key && 'bg-accent text-accent-foreground'
          )}
          onclick={() => onSelect(view.key)}>
          <span
            class={cn(
              'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
              typeBadgeClass(view.type)
            )}>
            {typeLabel(view.type)}
          </span>
          <span class="truncate">{view.title || view.key}</span>
          {#if activeViewKey === view.key}
            <span class="ml-auto text-[10px] text-muted-foreground">active</span>
          {/if}
        </DropdownMenu.Item>
      {/each}
    {/if}
  </DropdownMenu.Content>
</DropdownMenu.Root>
