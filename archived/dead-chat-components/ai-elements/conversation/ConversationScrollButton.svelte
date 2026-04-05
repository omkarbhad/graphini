<script lang="ts" module>
  import type { ButtonProps } from '$lib/components/ui/button/index.js';
  import { cn } from '$lib/util';

  export interface ConversationScrollButtonProps extends ButtonProps {}
</script>

<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { ArrowDown } from '@lucide/svelte';
  import { backOut } from 'svelte/easing';
  import { fly } from 'svelte/transition';
  import { getStickToBottomContext } from './stick-to-bottom-context.svelte';

  let { class: className, onclick, ...restProps }: ConversationScrollButtonProps = $props();

  const context = getStickToBottomContext();

  const handleScrollToBottom = (event: MouseEvent) => {
    context.scrollToBottom();
    if (onclick) {
      onclick(
        event as MouseEvent & {
          currentTarget: EventTarget & HTMLButtonElement;
        }
      );
    }
  };
</script>

{#if !context.isAtBottom}
  <div
    in:fly={{
      duration: 300,
      y: 10,
      easing: backOut
    }}
    out:fly={{
      duration: 200,
      y: 10,
      easing: backOut
    }}
    class="absolute bottom-24 left-1/2 -translate-x-1/2 sm:bottom-28">
    <Button
      class={cn(
        'rounded-full border-border bg-background/80 shadow-lg backdrop-blur-sm hover:bg-background/90 hover:shadow-xl',
        className
      )}
      onclick={handleScrollToBottom}
      size="icon"
      type="button"
      variant="outline"
      {...restProps}>
      <ArrowDown class="size-4" />
    </Button>
  </div>
{/if}
