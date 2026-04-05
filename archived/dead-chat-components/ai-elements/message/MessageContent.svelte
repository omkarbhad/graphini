<script lang="ts" module>
  import { cn, type WithElementRef } from '$lib/util';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  export interface MessageContentProps extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
    children?: Snippet;
  }
</script>

<script lang="ts">
  let {
    class: className,
    children,
    ref = $bindable(null),
    ...restProps
  }: MessageContentProps = $props();
</script>

<div bind:this={ref} class={cn('flex-1 space-y-2 overflow-hidden', className)} {...restProps}>
  {@render children?.()}
</div>
