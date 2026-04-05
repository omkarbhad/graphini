<script lang="ts">
  import { Brain, ChevronDown, ChevronRight, Sparkles } from 'lucide-svelte';

  interface Props {
    content: string;
    isStreaming?: boolean;
    durationMs?: number;
  }

  let { content, isStreaming = false, durationMs }: Props = $props();

  let isCollapsed = $state(false);
  let contentEl: HTMLDivElement | undefined = $state();

  // Derived initial collapsed state from isStreaming prop
  let shouldBeCollapsed = $derived(!isStreaming);

  // Initialize and update isCollapsed based on derived value
  $effect(() => {
    isCollapsed = shouldBeCollapsed;
  });

  // Clean content: strip markdown artifacts for display
  let displayContent = $derived(
    content
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/^#+\s+/gm, '')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .trim()
  );

  let wordCount = $derived(displayContent.split(/\s+/).filter((w) => w.length > 0).length);

  let formattedDuration = $derived.by(() => {
    if (!durationMs) return '';
    if (durationMs < 1000) return `${durationMs}ms`;
    const s = (durationMs / 1000).toFixed(1);
    return `${s}s`;
  });

  // Auto-collapse when streaming finishes
  $effect(() => {
    if (!isStreaming && content.length > 0) {
      isCollapsed = true;
    }
  });

  // Auto-scroll during streaming
  $effect(() => {
    if (isStreaming && contentEl) {
      contentEl.scrollTop = contentEl.scrollHeight;
    }
  });
</script>

<div
  class="reasoning-container group my-1.5 overflow-hidden rounded-lg border transition-all duration-200
    {isStreaming
    ? 'border-violet-500/30 bg-violet-500/[0.03] dark:border-violet-400/20 dark:bg-violet-500/[0.04]'
    : 'border-border/40 bg-muted/20 hover:border-border/60 dark:bg-muted/10'}">
  <!-- Header -->
  <button
    type="button"
    onclick={() => (isCollapsed = !isCollapsed)}
    class="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/30">
    <!-- Icon -->
    <div
      class="flex size-5 shrink-0 items-center justify-center rounded-md
        {isStreaming
        ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
        : 'bg-muted/60 text-muted-foreground/70'}">
      {#if isStreaming}
        <Sparkles class="size-3 animate-pulse" />
      {:else}
        <Brain class="size-3" />
      {/if}
    </div>

    <!-- Title -->
    <span
      class="flex-1 text-xs font-medium
        {isStreaming ? 'text-violet-700 dark:text-violet-300' : 'text-muted-foreground'}">
      {#if isStreaming}
        Thinking...
      {:else}
        Thought {formattedDuration ? `for ${formattedDuration}` : ''} · {wordCount} words
      {/if}
    </span>

    <!-- Streaming indicator -->
    {#if isStreaming}
      <div class="flex items-center gap-0.5">
        <span
          class="inline-block size-1 animate-pulse rounded-full bg-violet-500 [animation-delay:0ms]"
        ></span>
        <span
          class="inline-block size-1 animate-pulse rounded-full bg-violet-500 [animation-delay:150ms]"
        ></span>
        <span
          class="inline-block size-1 animate-pulse rounded-full bg-violet-500 [animation-delay:300ms]"
        ></span>
      </div>
    {/if}

    <!-- Chevron -->
    <div class="text-muted-foreground/40 transition-transform">
      {#if isCollapsed}
        <ChevronRight class="size-3.5" />
      {:else}
        <ChevronDown class="size-3.5" />
      {/if}
    </div>
  </button>

  <!-- Content -->
  {#if !isCollapsed}
    <div
      bind:this={contentEl}
      class="reasoning-content border-t px-3 py-2.5 transition-all duration-200
        {isStreaming ? 'border-violet-500/20' : 'border-border/30'}"
      style="max-height: {isStreaming ? '300px' : '250px'}; overflow-y: auto;">
      <p class="text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground/70">
        {displayContent}{#if isStreaming}<span class="reasoning-cursor"></span>{/if}
      </p>
    </div>
  {/if}
</div>

<style>
  /* Streaming glow border */
  .reasoning-container {
    position: relative;
  }

  /* Cursor blink */
  .reasoning-cursor {
    display: inline-block;
    width: 5px;
    height: 13px;
    background: hsl(263 70% 55%);
    border-radius: 1px;
    animation: reasoning-blink 0.8s ease-in-out infinite;
    vertical-align: text-bottom;
    margin-left: 1px;
  }

  @keyframes reasoning-blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.2;
    }
  }

  /* Scrollbar */
  .reasoning-content {
    scrollbar-width: thin;
    scrollbar-color: hsl(263 30% 60% / 0.2) transparent;
  }
  .reasoning-content::-webkit-scrollbar {
    width: 4px;
  }
  .reasoning-content::-webkit-scrollbar-track {
    background: transparent;
  }
  .reasoning-content::-webkit-scrollbar-thumb {
    background: hsl(263 30% 60% / 0.2);
    border-radius: 4px;
  }
</style>
