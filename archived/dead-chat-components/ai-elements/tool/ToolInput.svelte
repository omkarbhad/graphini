<script lang="ts">
  import * as Code from '$lib/features/chat/components/ai-elements/code/index.js';
  import { cn } from '$lib/utils';

  interface ToolInputProps {
    class?: string;
    input: any;
    [key: string]: any;
  }

  let { class: className = '', input, ...restProps }: ToolInputProps = $props();

  let formattedInput = $derived.by(() => {
    return JSON.stringify(input, null, 2);
  });

  let hasVisibleInput = $derived.by(() => {
    if (input == null) return false;
    if (typeof input !== 'object') return true;
    if (Array.isArray(input)) return input.length > 0;
    return Object.keys(input as Record<string, unknown>).length > 0;
  });

  let id = $props.id();
</script>

{#if hasVisibleInput}
  <div {id} class={cn('space-y-2 overflow-hidden p-4', className)} {...restProps}>
    <h4 class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Parameters</h4>
    <div class="rounded-md bg-muted/50">
      <Code.Root code={formattedInput} lang="json" hideLines>
        <Code.CopyButton />
      </Code.Root>
    </div>
  </div>
{/if}
