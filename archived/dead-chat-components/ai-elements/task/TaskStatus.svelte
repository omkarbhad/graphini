<script lang="ts" module>
  import type { HTMLAttributes } from 'svelte/elements';

  export interface TaskStatusProps extends HTMLAttributes<HTMLDivElement> {
    status: 'pending' | 'in-progress' | 'complete' | 'error';
    class?: string;
  }
</script>

<script lang="ts">
  import { cn } from '$lib/utils';
  import { AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-svelte';

  let { status, class: className, ...restProps }: TaskStatusProps = $props();

  const statusIcon = $derived(
    status === 'complete'
      ? CheckCircle
      : status === 'error'
        ? AlertCircle
        : status === 'in-progress'
          ? Loader2
          : Clock
  );

  const statusColor = $derived(
    status === 'complete'
      ? 'text-green-600'
      : status === 'error'
        ? 'text-red-600'
        : status === 'in-progress'
          ? 'text-blue-600'
          : 'text-gray-500'
  );

  const isAnimating = $derived(status === 'in-progress');
  const IconComponent = $derived(statusIcon);
</script>

<div class={cn('flex-shrink-0', statusColor, className)} {...restProps}>
  <div class:animate-spin={isAnimating}>
    <IconComponent class="h-4 w-4" />
  </div>
</div>
