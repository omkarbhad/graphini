<script lang="ts">
  export let content = '';
  export let isStreaming = false;
</script>

<div class="reasoning-content text-sm text-muted-foreground">
  <div class="whitespace-pre-wrap">
    {content}
    {#if isStreaming}
      <span class="animate-pulse">▊</span>
    {/if}
  </div>
</div>
