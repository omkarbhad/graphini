<script lang="ts">
  import { Sparkles, Trash2 } from 'lucide-svelte';

  interface Props {
    modelName?: string;
    onClearChat?: () => void;
    class?: string;
  }

  let { modelName, onClearChat, class: className = '' }: Props = $props();
</script>

<header
  class="flex shrink-0 items-center gap-2.5 border-b border-border/30 bg-card/50 px-3 py-2 backdrop-blur-sm {className}">
  <div
    class="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500/15 to-blue-500/15">
    <Sparkles class="size-3.5 text-violet-500" />
  </div>
  <div class="flex flex-1 items-center gap-1.5 overflow-hidden">
    <span class="text-[13px] font-medium text-foreground">Diagram Assistant</span>
    {#if modelName}
      <span class="truncate text-[10px] text-muted-foreground/50">· {modelName}</span>
    {/if}
  </div>
  {#if onClearChat}
    <button
      type="button"
      onclick={onClearChat}
      title="Clear chat"
      class="flex size-6 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-muted/50 hover:text-muted-foreground">
      <Trash2 class="size-3.5" />
    </button>
  {/if}
</header>
