<script lang="ts" module>
  import { cn, type WithElementRef } from '$lib/util';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  export interface MessageProps extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
    children?: Snippet;
    from?: 'user' | 'assistant';
  }
</script>

<script lang="ts">
  let {
    class: className,
    children,
    from = 'assistant',
    ref = $bindable(null),
    ...restProps
  }: MessageProps = $props();
</script>

<div
  bind:this={ref}
  class={cn('flex gap-3 p-4', from === 'user' ? 'flex-row-reverse' : 'flex-row', className)}
  {...restProps}>
  {@render children?.()}
</div>
