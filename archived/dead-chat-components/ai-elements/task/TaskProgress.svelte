<script lang="ts" module>
  import type { HTMLAttributes } from 'svelte/elements';

  export interface TaskProgressProps extends HTMLAttributes<HTMLDivElement> {
    value: number;
    class?: string;
  }
</script>

<script lang="ts">
  import { cn } from '$lib/utils';

  let { value, class: className, ...restProps }: TaskProgressProps = $props();

  // Ensure value is between 0 and 100
  const progressValue = $derived(Math.max(0, Math.min(100, value)));
</script>

<div class={cn('w-full', className)} {...restProps}>
  <div class="h-1.5 w-full rounded-full bg-muted">
    <div
      class="h-1.5 rounded-full bg-primary transition-all duration-300"
      style="width: {progressValue}%">
    </div>
  </div>
</div>
