<script lang="ts">
  import {
    AlertCircle,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    Code2,
    Loader2,
    Minus,
    Plus,
    Sparkles
  } from 'lucide-svelte';

  let {
    isGenerating = false,
    currentCode = '',
    previousCode = '',
    generationStep = 'idle',
    errorMessage = '',
    totalTokens = 0,
    generatedTokens = 0,
    showDiff = false
  }: {
    isGenerating?: boolean;
    currentCode?: string;
    previousCode?: string;
    generationStep?: 'idle' | 'thinking' | 'writing' | 'validating' | 'complete' | 'error';
    errorMessage?: string;
    totalTokens?: number;
    generatedTokens?: number;
    showDiff?: boolean;
  } = $props();

  let codeContainer: HTMLDivElement;
  let highlightedCode = $state('');
  let isCodeExpanded = $state(true);
  let diffResult = $state<{ type: 'unchanged' | 'added' | 'removed'; line: string }[]>([]);
  let addedCount = $state(0);
  let removedCount = $state(0);

  // Simple syntax highlighting for Mermaid
  function highlightMermaidCode(code: string): string {
    return (
      code
        // Escape HTML first
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Highlight diagram types
        .replace(
          /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitgraph|journey|timeline|mindmap|architecture|block|packet|network|sankey|requirement|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|requirementDiagram)/gm,
          '<span class="text-cyan-400 font-bold">$1</span>'
        )
        // Highlight node definitions
        .replace(
          /(\w+)(\[([^\]]*)\])/g,
          '<span class="text-yellow-300 font-medium">$1</span><span class="text-gray-400">[</span><span class="text-green-400">$2</span><span class="text-gray-400">]</span>'
        )
        // Highlight arrows and connections
        .replace(
          /(-->|--->|<-->|---|-->|->>|-->>|<--|\.\.\.|===)/g,
          '<span class="text-blue-400 font-bold">$1</span>'
        )
        // Highlight comments
        .replace(/(%%.+)/g, '<span class="text-gray-500 italic">$1</span>')
        // Highlight keywords
        .replace(
          /\b(subgraph|direction|TB|TD|BT|LR|RL|style|link|click|classDef|class)\b/g,
          '<span class="text-purple-400 font-medium">$1</span>'
        )
        // Highlight strings in quotes
        .replace(/'([^']*)'/g, '<span class="text-green-300">\'$1\'</span>')
        .replace(/"([^"]*)"/g, '<span class="text-green-300">"$1"</span>')
        // Highlight numbers
        .replace(/\b(\d+)\b/g, '<span class="text-orange-400">$1</span>')
    );
  }

  // Auto-scroll to bottom as code is generated
  $effect(() => {
    if (codeContainer) {
      codeContainer.scrollTop = codeContainer.scrollHeight;
    }
  });

  // Update highlighted code when current code changes
  $effect(() => {
    highlightedCode = highlightMermaidCode(currentCode);
  });

  // Compute diff between previous and current code
  function computeDiff(
    oldCode: string,
    newCode: string
  ): { type: 'unchanged' | 'added' | 'removed'; line: string }[] {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    const result: { type: 'unchanged' | 'added' | 'removed'; line: string }[] = [];

    // Simple line-by-line diff using LCS approach
    const lcs = computeLCS(oldLines, newLines);
    let oldIdx = 0;
    let newIdx = 0;
    let lcsIdx = 0;

    while (oldIdx < oldLines.length || newIdx < newLines.length) {
      if (lcsIdx < lcs.length && oldIdx < oldLines.length && oldLines[oldIdx] === lcs[lcsIdx]) {
        if (newIdx < newLines.length && newLines[newIdx] === lcs[lcsIdx]) {
          result.push({ type: 'unchanged', line: lcs[lcsIdx] });
          oldIdx++;
          newIdx++;
          lcsIdx++;
        } else if (newIdx < newLines.length) {
          result.push({ type: 'added', line: newLines[newIdx] });
          newIdx++;
        }
      } else if (
        oldIdx < oldLines.length &&
        (lcsIdx >= lcs.length || oldLines[oldIdx] !== lcs[lcsIdx])
      ) {
        result.push({ type: 'removed', line: oldLines[oldIdx] });
        oldIdx++;
      } else if (newIdx < newLines.length) {
        result.push({ type: 'added', line: newLines[newIdx] });
        newIdx++;
      }
    }

    return result;
  }

  function computeLCS(arr1: string[], arr2: string[]): string[] {
    const m = arr1.length;
    const n = arr2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const result: string[] = [];
    let i = m,
      j = n;
    while (i > 0 && j > 0) {
      if (arr1[i - 1] === arr2[j - 1]) {
        result.unshift(arr1[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return result;
  }

  // Update diff when codes change
  $effect(() => {
    if (showDiff && previousCode && currentCode) {
      diffResult = computeDiff(previousCode, currentCode);
      addedCount = diffResult.filter((d) => d.type === 'added').length;
      removedCount = diffResult.filter((d) => d.type === 'removed').length;
    } else {
      diffResult = [];
      addedCount = 0;
      removedCount = 0;
    }
  });

  // Calculate progress percentage
  $effect(() => {
    if (totalTokens > 0) {
      generatedTokens = Math.min(generatedTokens, totalTokens);
    }
  });

  function getStepIcon() {
    switch (generationStep) {
      case 'thinking':
        return Loader2;
      case 'writing':
        return Code2;
      case 'validating':
        return Sparkles;
      case 'complete':
        return CheckCircle;
      case 'error':
        return AlertCircle;
      default:
        return Code2;
    }
  }

  function getStepColor() {
    switch (generationStep) {
      case 'thinking':
        return 'text-blue-500';
      case 'writing':
        return 'text-orange-500';
      case 'validating':
        return 'text-purple-500';
      case 'complete':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  }

  function getStepText() {
    switch (generationStep) {
      case 'thinking':
        return 'Analyzing requirements...';
      case 'writing':
        return 'Generating diagram code...';
      case 'validating':
        return 'Validating syntax...';
      case 'complete':
        return 'Diagram generated successfully';
      case 'error':
        return 'Generation failed';
      default:
        return 'Ready to generate';
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(currentCode).then(() => {
      // You could add a toast notification here
    });
  }

  // Simulate real-time code generation (for demo purposes)
  function simulateGeneration() {
    isGenerating = true;
    generationStep = 'thinking';
    currentCode = '';
    totalTokens = 50;
    generatedTokens = 0;

    setTimeout(() => {
      generationStep = 'writing';
      const targetCode = `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process]
    B -->|No| D[End]
    C --> E[Output]
    E --> D`;

      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < targetCode.length) {
          currentCode += targetCode[currentIndex];
          currentIndex++;
          generatedTokens = Math.floor((currentIndex / targetCode.length) * totalTokens);
        } else {
          clearInterval(interval);
          generationStep = 'validating';
          setTimeout(() => {
            generationStep = 'complete';
            isGenerating = false;
          }, 1000);
        }
      }, 30);
    }, 1500);
  }
</script>

<div class="diagram-generation-ui">
  <!-- Header -->
  <div class="diff-header">
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2">
        <div class="code-logo">
          <Code2 class="size-4 text-primary" />
        </div>
        <button
          onclick={() => (isCodeExpanded = !isCodeExpanded)}
          class="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground">
          {#if isCodeExpanded}
            <ChevronDown class="size-4" />
          {:else}
            <ChevronRight class="size-4" />
          {/if}
          <h3 class="text-sm font-semibold text-foreground">
            {#if showDiff && (addedCount > 0 || removedCount > 0)}
              Diagram Updated
            {:else if isGenerating}
              Generating Diagram
            {:else if generationStep === 'complete'}
              Diagram Generated
            {:else}
              Diagram Code
            {/if}
          </h3>
        </button>
      </div>

      {#if showDiff && (addedCount > 0 || removedCount > 0)}
        <div class="flex items-center gap-2 font-mono text-xs">
          <span class="diff-stat removed">
            <Minus class="size-3" />
            {removedCount}
          </span>
          <span class="diff-stat added">
            <Plus class="size-3" />
            {addedCount}
          </span>
        </div>
      {:else if isGenerating}
        <span class={`text-xs ${getStepColor()}`}>{getStepText()}</span>
      {/if}
    </div>

    <div class="flex items-center gap-2">
      {#if currentCode && !isGenerating}
        <button
          onclick={copyCode}
          class="flex items-center gap-2 rounded bg-muted px-3 py-1 text-sm transition-colors hover:bg-muted/80">
          <Code2 class="size-4" />
          Copy Code
        </button>
      {/if}
    </div>
  </div>

  <!-- Collapsible Content -->
  {#if isCodeExpanded}
    <!-- Progress Bar -->
    {#if isGenerating && totalTokens > 0}
      <div class="mb-4">
        <div class="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>Generating</span>
          <span>{Math.round((generatedTokens / totalTokens) * 100)}%</span>
        </div>
        <div class="h-2 w-full rounded-full bg-muted">
          <div
            class="h-2 rounded-full bg-primary transition-all duration-300 ease-out"
            style="width: {Math.min((generatedTokens / totalTokens) * 100, 100)}%">
          </div>
        </div>
      </div>
    {/if}

    <!-- Code Display -->
    <div class="relative">
      <div
        bind:this={codeContainer}
        class="code-display max-h-96 overflow-auto rounded-lg border border-slate-700 bg-slate-900 p-4 font-mono text-sm text-slate-100">
        {#if showDiff && diffResult.length > 0}
          <!-- Diff View -->
          <div class="diff-view">
            {#each diffResult as diffLine, i}
              <div class="diff-line {diffLine.type}">
                <span class="line-indicator">
                  {#if diffLine.type === 'added'}
                    <Plus class="size-3" />
                  {:else if diffLine.type === 'removed'}
                    <Minus class="size-3" />
                  {:else}
                    <span class="w-3"></span>
                  {/if}
                </span>
                <span class="line-number">{i + 1}</span>
                <span class="line-content">{diffLine.line || ' '}</span>
              </div>
            {/each}
          </div>
        {:else if currentCode}
          <div class="flex">
            <!-- Line numbers -->
            <div class="pr-3 text-right text-slate-600 select-none">
              {#each currentCode.split('\n') as _, i}
                <div>{i + 1}</div>
              {/each}
            </div>
            <!-- Code content -->
            <div class="flex-1">
              <pre class="whitespace-pre-wrap">{@html highlightedCode}</pre>
            </div>
          </div>
        {:else if isGenerating}
          <div class="flex h-32 items-center justify-center text-slate-400">
            <div class="text-center">
              <Loader2 class="mx-auto mb-2 size-8 animate-spin" />
              <p>Preparing to generate diagram...</p>
            </div>
          </div>
        {:else}
          <div class="flex h-32 items-center justify-center text-slate-400">
            <div class="text-center">
              <Code2 class="mx-auto mb-2 size-8" />
              <p>Diagram code will appear here during generation</p>
              <button
                onclick={simulateGeneration}
                class="mt-4 rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700">
                Simulate Generation
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Error Display -->
  {#if generationStep === 'error' && errorMessage}
    <div class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
      <div class="flex items-start gap-2">
        <AlertCircle class="mt-0.5 size-5 text-red-500" />
        <div>
          <p class="text-sm font-medium text-red-800">Generation Error</p>
          <p class="text-sm text-red-600">{errorMessage}</p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Generation Stats -->
  {#if currentCode && !isGenerating}
    <div class="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
      <span>{currentCode.split('\n').length} lines</span>
      <span>{currentCode.length} characters</span>
      <span>{currentCode.split(' ').filter(Boolean).length} tokens</span>
    </div>
  {/if}
</div>

<style>
  .diff-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    background: linear-gradient(to right, hsl(var(--muted) / 0.5), hsl(var(--muted) / 0.3));
    border: 1px solid hsl(var(--border));
    border-bottom: none;
    border-radius: 0.5rem 0.5rem 0 0;
    margin-bottom: 0;
  }

  .code-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    background: linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05));
    border-radius: 0.375rem;
    border: 1px solid hsl(var(--primary) / 0.2);
  }

  .diff-stat {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-weight: 600;
  }

  .diff-stat.removed {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
  }

  .diff-stat.added {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
  }

  .diff-view {
    font-family: 'Fira Code', 'Monaco', 'Consolas', 'Ubuntu Mono', monospace;
  }

  .diff-line {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.125rem 0;
    border-radius: 0.125rem;
  }

  .diff-line.added {
    background: rgba(34, 197, 94, 0.15);
  }

  .diff-line.added .line-indicator {
    color: #22c55e;
  }

  .diff-line.added .line-content {
    color: #86efac;
  }

  .diff-line.removed {
    background: rgba(239, 68, 68, 0.15);
  }

  .diff-line.removed .line-indicator {
    color: #ef4444;
  }

  .diff-line.removed .line-content {
    color: #fca5a5;
    text-decoration: line-through;
    opacity: 0.8;
  }

  .diff-line.unchanged .line-indicator {
    color: transparent;
  }

  .line-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    flex-shrink: 0;
  }

  .line-number {
    color: #64748b;
    min-width: 2rem;
    text-align: right;
    user-select: none;
    flex-shrink: 0;
  }

  .line-content {
    flex: 1;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .code-display {
    position: relative;
    tab-size: 2;
  }

  .code-display pre {
    margin: 0;
    font-family: 'Fira Code', 'Monaco', 'Consolas', 'Ubuntu Mono', monospace;
  }

  /* Line numbers styling */
  .code-display .text-slate-600 {
    min-width: 2rem;
    line-height: 1.5;
  }

  /* Custom scrollbar for code display */
  .code-display::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .code-display::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
  }

  .code-display::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
  }

  .code-display::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.5);
  }
</style>
