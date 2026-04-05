<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Brain, Eye, EyeOff } from 'lucide-svelte';

  export let isVisible = false;
  export let hasContent = false;

  const dispatch = createEventDispatcher();

  function toggleVisibility() {
    isVisible = !isVisible;
    dispatch('toggle', { isVisible });
  }
</script>

{#if hasContent}
  <button
    on:click={toggleVisibility}
    class="flex items-center space-x-2 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
    <Brain class="h-3 w-3" />
    {#if isVisible}
      <EyeOff class="h-3 w-3" />
    {:else}
      <Eye class="h-3 w-3" />
    {/if}
    <span>{isVisible ? 'Hide' : 'Show'} thinking</span>
  </button>
{/if}
