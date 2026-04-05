<script lang="ts">
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { cn } from '$lib/utils';
  import { Check, Copy } from '@lucide/svelte';

  interface MCPIconResultsProps {
    results: Array<{
      name: string;
      category: string;
      path: string;
      confidence?: number;
    }>;
    maxResults?: number;
    selectable?: boolean;
    class?: string;
    [key: string]: any;
  }

  let {
    results,
    maxResults = 10,
    selectable = false,
    class: className = '',
    ...restProps
  }: MCPIconResultsProps = $props();

  let displayedResults = $derived.by(() => {
    return results.slice(0, maxResults);
  });

  let selectedIcons = $state<string[]>([]);
  let copiedIcon = $state<string | null>(null);

  async function copyIconName(iconName: string) {
    try {
      await navigator.clipboard.writeText(iconName);
      copiedIcon = iconName;
      setTimeout(() => {
        copiedIcon = null;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy icon name:', error);
    }
  }

  function toggleIconSelection(iconName: string) {
    if (selectedIcons.includes(iconName)) {
      selectedIcons = selectedIcons.filter((name) => name !== iconName);
    } else {
      selectedIcons = [...selectedIcons, iconName];
    }
  }

  function getConfidenceColor(confidence: number) {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800';
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  }

  function getCategoryColor(category: string) {
    const colors: Record<string, string> = {
      compute: 'bg-blue-100 text-blue-800',
      storage: 'bg-green-100 text-green-800',
      networking: 'bg-purple-100 text-purple-800',
      database: 'bg-orange-100 text-orange-800',
      analytics: 'bg-red-100 text-red-800',
      security: 'bg-indigo-100 text-indigo-800',
      management: 'bg-gray-100 text-gray-800'
    };
    return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-800';
  }
</script>

<div class={cn('space-y-3', className)} {...restProps}>
  <div class="flex items-center justify-between">
    <h4 class="text-sm font-medium text-foreground">
      {results.length} icon{results.length !== 1 ? 's' : ''} found
    </h4>
    {#if selectable && selectedIcons.length > 0}
      <Badge variant="secondary" class="text-xs">
        {selectedIcons.length} selected
      </Badge>
    {/if}
  </div>

  <div class="space-y-2">
    {#each displayedResults as icon (icon.name)}
      <div
        class={cn(
          'flex items-center justify-between rounded-lg border p-3 transition-colors',
          selectable && selectedIcons.includes(icon.name)
            ? 'border-blue-200 bg-blue-50'
            : 'border-border bg-muted/30 hover:bg-muted/50'
        )}
        onclick={() => selectable && toggleIconSelection(icon.name)}>
        <div class="flex min-w-0 flex-1 items-center gap-3">
          {#if icon.path}
            <img
              src={icon.path}
              alt={icon.name}
              class="h-8 w-8 flex-shrink-0 object-contain"
              onerror="this.style.display='none'" />
          {:else}
            <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-muted">
              <span class="text-xs text-muted-foreground">📦</span>
            </div>
          {/if}

          <div class="min-w-0 flex-1">
            <div class="mb-1 flex items-center gap-2">
              <span class="truncate text-sm font-medium text-foreground">
                {icon.name}
              </span>
              {#if icon.confidence}
                <Badge
                  variant="secondary"
                  class={cn('text-xs', getConfidenceColor(icon.confidence))}>
                  {Math.round(icon.confidence * 100)}%
                </Badge>
              {/if}
            </div>
            <div class="flex items-center gap-2">
              <Badge variant="outline" class={cn('text-xs', getCategoryColor(icon.category))}>
                {icon.category}
              </Badge>
            </div>
          </div>
        </div>

        <div class="flex flex-shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onclick={() => copyIconName(icon.name)}
            class="h-8 w-8 p-0">
            {#if copiedIcon === icon.name}
              <Check class="h-4 w-4 text-green-600" />
            {:else}
              <Copy class="h-4 w-4" />
            {/if}
          </Button>
        </div>
      </div>
    {/each}

    {#if results.length > maxResults}
      <div class="py-2 text-center">
        <span class="text-xs text-muted-foreground">
          Showing {maxResults} of {results.length} results
        </span>
      </div>
    {/if}
  </div>

  {#if selectedIcons.length > 0}
    <div class="border-t pt-3">
      <div class="mb-2 text-sm text-muted-foreground">Selected icons:</div>
      <div class="flex flex-wrap gap-1">
        {#each selectedIcons as iconName}
          <Badge variant="secondary" class="text-xs">
            {iconName}
          </Badge>
        {/each}
      </div>
    </div>
  {/if}
</div>
