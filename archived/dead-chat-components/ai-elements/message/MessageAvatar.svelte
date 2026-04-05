<script lang="ts" module>
  import { cn, type WithElementRef } from '$lib/util';
  import type { HTMLAttributes } from 'svelte/elements';

  export interface MessageAvatarProps extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
    src?: string;
    name?: string;
    fallback?: string;
  }
</script>

<script lang="ts">
  let {
    class: className,
    src,
    name,
    fallback,
    ref = $bindable(null),
    ...restProps
  }: MessageAvatarProps = $props();

  const initials = $derived(() => {
    if (fallback) return fallback;
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  });
</script>

<div
  bind:this={ref}
  class={cn(
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium select-none',
    className
  )}
  {...restProps}>
  {#if src}
    <img {src} alt={name || 'Avatar'} class="h-full w-full rounded-full object-cover" />
  {:else}
    <span>{initials()}</span>
  {/if}
</div>
