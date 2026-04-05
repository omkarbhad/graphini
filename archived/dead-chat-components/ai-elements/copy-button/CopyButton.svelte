<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import { UseClipboard } from '$lib/hooks/use-clipboard.svelte';
  import { cn } from '$lib/utils';
  import { Check, Copy } from 'lucide-svelte';
  import type { CopyButtonProps } from './types';

  let {
    ref = $bindable(null),
    text,
    icon,
    size = 'icon',
    variant = 'ghost',
    animationDuration = 2000,
    disbled = false,
    onCopy,
    children,
    class: className,
    ...rest
  }: CopyButtonProps = $props();

  const clipboard = $derived(new UseClipboard({ delay: animationDuration }));

  async function handleCopy() {
    if (disbled) return;
    await clipboard.copy(text);
    onCopy?.(clipboard.status);
  }
</script>

<Button
  bind:ref
  {size}
  {variant}
  onclick={handleCopy}
  disabled={disbled}
  class={cn('h-7 w-7', className)}
  style={rest.style}
  title={rest.title}
  aria-label={rest['aria-label']}>
  {#if clipboard.copied}
    <Check class="size-3.5 text-green-500" />
  {:else if icon}
    {@render icon()}
  {:else}
    <Copy class="size-3.5" />
  {/if}
  {@render children?.()}
</Button>
