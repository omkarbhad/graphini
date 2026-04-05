<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Loader2 } from 'lucide-svelte';

  interface Props {
    class?: string;
    isLoading?: boolean;
    progress?: number;
    size?: 'sm' | 'md' | 'lg';
    label?: string;
  }

  let {
    class: className = '',
    isLoading = false,
    progress = 0,
    size = 'md',
    label = 'Analyzing...',
    ...restProps
  }: Props = $props();

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const containerClasses = {
    sm: 'py-2',
    md: 'py-3',
    lg: 'py-4'
  };
</script>

<div
  class={cn(
    'flex items-center justify-center gap-3 transition-all duration-300',
    containerClasses[size],
    isLoading && 'animate-pulse',
    className
  )}
  {...restProps}
  role="status"
  aria-label={label}
  aria-busy={isLoading}>
  {#if isLoading}
    <div class="relative">
      <Loader2 class={cn('animate-spin text-primary', sizeClasses[size])} />
      {#if progress > 0}
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="text-xs font-medium text-primary">
            {Math.round(progress)}%
          </span>
        </div>
      {/if}
    </div>
    <span class="text-sm text-muted-foreground">
      {label}
    </span>
  {:else}
    <div class="flex items-center gap-2 text-green-600 dark:text-green-400">
      <div class="h-3 w-3 rounded-full bg-green-600 dark:bg-green-400"></div>
      <span class="text-sm font-medium">Analysis complete</span>
    </div>
  {/if}
</div>
