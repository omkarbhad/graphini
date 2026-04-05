<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Brain, Loader2 } from 'lucide-svelte';

  export let isStreaming = false;
  export let content = '';
  export let isVisible = true;

  const dispatch = createEventDispatcher();

  function toggleVisibility() {
    isVisible = !isVisible;
  }
</script>

{#if isVisible}
  <div class="reasoning-container mb-4 rounded-lg border border-muted bg-muted/30 p-4">
    <div class="flex items-start space-x-3">
      <div class="mt-1 flex-shrink-0">
        {#if isStreaming}
          <Loader2 class="h-4 w-4 animate-spin text-primary" />
        {:else}
          <Brain class="h-4 w-4 text-primary" />
        {/if}
      </div>

      <div class="min-w-0 flex-1">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-sm font-medium text-foreground">Thinking Process</h3>
          <button
            on:click={toggleVisibility}
            class="text-xs text-muted-foreground transition-colors hover:text-foreground">
            Hide
          </button>
        </div>

        <div class="text-sm whitespace-pre-wrap text-muted-foreground">
          {content}
          {#if isStreaming}
            <span class="animate-pulse">▊</span>
          {/if}
        </div>
      </div>
    </div>
  </div>
{:else}
  <button
    on:click={toggleVisibility}
    class="mb-4 flex items-center space-x-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
    <Brain class="h-3 w-3" />
    <span>Show thinking process</span>
  </button>
{/if}
