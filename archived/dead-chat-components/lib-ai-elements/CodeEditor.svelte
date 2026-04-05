<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Check, Code2, Copy, Play, Sparkles } from 'lucide-svelte';

  interface Props {
    code: string;
    language?: string;
    title?: string;
    isStreaming?: boolean;
    onApply?: () => void;
    showApply?: boolean;
  }

  let {
    code,
    language = 'mermaid',
    title = 'Code Generation',
    isStreaming = false,
    onApply,
    showApply = true
  }: Props = $props();

  let copied = $state(false);
  let lineCount = $derived(code.split('\n').length);
  let charCount = $derived(code.length);

  function copyCode() {
    navigator.clipboard.writeText(code);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  // Syntax highlighting for mermaid - Vercel style
  function highlightCode(text: string): string {
    // Simple syntax highlighting with theme-aware colors
    return text
      .replace(
        /(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|mindmap|timeline)/g,
        '<span class="syntax-keyword">$1</span>'
      )
      .replace(/(TB|BT|LR|RL|TD)/g, '<span class="syntax-direction">$1</span>')
      .replace(/(-->|---|\.-\.|-\.->|==>|--x|--o)/g, '<span class="syntax-arrow">$1</span>')
      .replace(
        /(\[|\(|\{)([^\[\(\{\]\)\}]*)(\]|\)|\})/g,
        '<span class="syntax-bracket">$1</span><span class="syntax-string">$2</span><span class="syntax-bracket">$3</span>'
      )
      .replace(/:\s*([^\n]*)/g, ': <span class="syntax-label">$1</span>');
  }
</script>

<div class="my-4 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
  <!-- Vercel-style header -->
  <div class="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2">
        <div class="flex size-6 items-center justify-center rounded-md bg-foreground">
          <Code2 class="size-3.5 text-background" />
        </div>
        <span class="text-sm font-medium text-foreground">{title}</span>
      </div>
      {#if isStreaming}
        <div class="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1">
          <div class="size-1.5 animate-pulse rounded-full bg-primary"></div>
          <span class="text-xs font-medium text-primary">Generating...</span>
        </div>
      {/if}
    </div>

    <div class="flex items-center gap-2">
      <!-- Stats -->
      <div class="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
        <span>{lineCount} lines</span>
        <span class="text-border">•</span>
        <span>{charCount} chars</span>
        <span class="rounded-md bg-muted px-2 py-0.5 font-mono text-foreground">{language}</span>
      </div>

      <!-- Copy button -->
      <Button variant="outline" size="sm" class="h-7 gap-1.5 text-xs" onclick={copyCode}>
        {#if copied}
          <Check class="text-success size-3.5" />
          <span>Copied</span>
        {:else}
          <Copy class="size-3.5" />
          <span class="hidden sm:inline">Copy</span>
        {/if}
      </Button>

      <!-- Apply button -->
      {#if showApply && onApply}
        <Button
          variant="default"
          size="sm"
          class="h-7 gap-1.5 text-xs"
          onclick={onApply}
          disabled={isStreaming}>
          <Play class="size-3.5" />
          <span>Apply</span>
        </Button>
      {/if}
    </div>
  </div>

  <!-- Code content with Vercel-style editor look -->
  <div class="relative bg-card">
    <!-- Line numbers -->
    <div
      class="absolute top-0 bottom-0 left-0 w-12 border-r border-border bg-muted/20 py-4 text-right select-none">
      {#each Array(lineCount) as _, i}
        <div class="px-3 font-mono text-xs leading-6 text-muted-foreground/50">{i + 1}</div>
      {/each}
    </div>

    <!-- Code content -->
    <div class="ml-12 overflow-x-auto p-4">
      <pre class="m-0 font-mono text-sm leading-6 text-foreground"><code
          >{@html highlightCode(code)}</code></pre>
    </div>

    <!-- Streaming cursor effect -->
    {#if isStreaming}
      <div
        class="absolute right-4 bottom-4 flex items-center gap-2 rounded-lg border border-border bg-background/90 px-3 py-1.5 shadow-sm">
        <Sparkles class="size-4 animate-pulse text-primary" />
        <span class="text-xs font-medium text-foreground">AI is writing...</span>
      </div>
    {/if}
  </div>

  <!-- Footer -->
  <div class="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2">
    <div class="flex items-center gap-3">
      <div class="flex gap-1.5">
        <div class="size-2.5 rounded-full bg-destructive/60"></div>
        <div class="bg-warning/60 size-2.5 rounded-full"></div>
        <div class="bg-success/60 size-2.5 rounded-full"></div>
      </div>
      <span class="text-xs text-muted-foreground">Mermaid Diagram</span>
    </div>
    {#if isStreaming}
      <div class="flex items-center gap-1">
        <div class="flex gap-1">
          {#each Array(3) as _, i}
            <div
              class="size-1.5 rounded-full bg-primary"
              style="animation: bounce 1s infinite {i * 0.15}s">
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  @keyframes bounce {
    0%,
    80%,
    100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-4px);
    }
  }

  /* Vercel-style syntax highlighting */
  :global(.syntax-keyword) {
    color: #8b5cf6;
  }
  :global(.dark .syntax-keyword) {
    color: #a78bfa;
  }

  :global(.syntax-direction) {
    color: #3b82f6;
  }
  :global(.dark .syntax-direction) {
    color: #60a5fa;
  }

  :global(.syntax-arrow) {
    color: #f59e0b;
  }
  :global(.dark .syntax-arrow) {
    color: #fbbf24;
  }

  :global(.syntax-bracket) {
    color: #64748b;
  }
  :global(.dark .syntax-bracket) {
    color: #94a3b8;
  }

  :global(.syntax-string) {
    color: #10b981;
  }
  :global(.dark .syntax-string) {
    color: #34d399;
  }

  :global(.syntax-label) {
    color: #06b6d4;
  }
  :global(.dark .syntax-label) {
    color: #22d3ee;
  }
</style>
