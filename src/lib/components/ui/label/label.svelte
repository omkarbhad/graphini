<script lang="ts">
  import { cn } from '$lib/util';

  interface Props {
    for?: string;
    class?: string;
    children: import('svelte').Snippet;
  }

  let { for: htmlFor, class: className, children }: Props = $props();
</script>

<label
  for={htmlFor}
  class={cn(
    'text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
    className
  )}>
  {@render children()}
</label>
