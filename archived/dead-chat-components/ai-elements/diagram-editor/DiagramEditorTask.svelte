<script lang="ts">
  import { AlertCircle, AlertTriangle, Check, ChevronDown, FileCode, Loader2 } from 'lucide-svelte';
  import type { DiagramEditorTaskType } from './types';

  interface Props {
    task: DiagramEditorTaskType;
    onViewCode?: () => void;
    onLivePreview?: () => void;
    onRetry?: () => void;
  }

  let { task, onViewCode, onLivePreview, onRetry }: Props = $props();

  let isExpanded = $state(false);
  let showCode = $state(false);

  // Derived values
  const isRunning = $derived(task.status === 'in-progress');
  const isComplete = $derived(task.status === 'complete');
  const hasError = $derived(task.status === 'error');

  const diagramCode = $derived(task.metadata?.code || task.metadata?.partialCode || '');
  const lineCount = $derived(task.metadata?.lineCount || diagramCode.split('\n').length);
  const diagramType = $derived(task.metadata?.diagramType || 'Unknown');

  // Change tracking
  const changes = $derived(task.metadata?.changes);
  const hasChanges = $derived(changes && (changes.additions > 0 || changes.removals > 0));
  const streamedChanges = $derived(task.metadata?.streamedChanges || []);

  // Lint tracking
  const lint = $derived(task.metadata?.lint);
  const lintErrors = $derived(lint?.errors || 0);
  const lintWarnings = $derived(lint?.warnings || 0);
  const hasLintIssues = $derived(lintErrors > 0 || lintWarnings > 0);

  // Status colors
  const statusColor = $derived(
    isRunning
      ? 'text-blue-500'
      : hasError
        ? 'text-red-500'
        : lintErrors > 0
          ? 'text-amber-500'
          : 'text-emerald-500'
  );

  const bgColor = $derived(
    isRunning
      ? 'bg-blue-500/5 border-blue-500/20'
      : hasError
        ? 'bg-red-500/5 border-red-500/20'
        : lintErrors > 0
          ? 'bg-amber-500/5 border-amber-500/20'
          : 'bg-emerald-500/5 border-emerald-500/20'
  );

  const progressColor = $derived(
    isRunning
      ? 'bg-blue-500'
      : hasError
        ? 'bg-red-500'
        : lintErrors > 0
          ? 'bg-amber-500'
          : 'bg-emerald-500'
  );

  function getOperationLabel() {
    switch (task.operation) {
      case 'read':
        return 'Reading';
      case 'create':
        return 'Creating';
      case 'update':
        return 'Updating';
      case 'clear':
        return 'Clearing';
      case 'patch':
        return 'Patching';
      default:
        return 'Processing';
    }
  }

  function getCompletedLabel() {
    switch (task.operation) {
      case 'read':
        return 'Read';
      case 'create':
        return 'Created';
      case 'update':
        return 'Updated';
      case 'clear':
        return 'Cleared';
      case 'patch':
        return 'Patched';
      default:
        return 'Completed';
    }
  }
</script>

<!-- Unified Tool Card -->
<div class="rounded-lg border {bgColor} overflow-hidden transition-all duration-200">
  <!-- Header -->
  <button
    type="button"
    onclick={() => (isExpanded = !isExpanded)}
    class="flex w-full items-center gap-2.5 px-3 py-2 transition-colors hover:bg-black/5 dark:hover:bg-white/5">
    <!-- Status Icon -->
    <div class="flex-shrink-0">
      {#if isRunning}
        <Loader2 class="size-4 {statusColor} animate-spin" />
      {:else if hasError}
        <AlertCircle class="size-4 {statusColor}" />
      {:else if lintErrors > 0}
        <AlertTriangle class="size-4 {statusColor}" />
      {:else}
        <Check class="size-4 {statusColor}" />
      {/if}
    </div>

    <!-- Title & Status -->
    <div class="min-w-0 flex-1 text-left">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs font-medium {statusColor}">
          {#if isRunning}
            {getOperationLabel()}...
          {:else if hasError}
            Failed
          {:else}
            {getCompletedLabel()}
          {/if}
        </span>

        <!-- Change counts -->
        {#if hasChanges}
          <span class="text-[10px] text-muted-foreground">
            ● {changes?.additions || 0 > 0 ? `+${changes?.additions}` : ''}{(changes?.additions ||
              0) > 0 && (changes?.removals || 0) > 0
              ? ', '
              : ''}{changes?.removals || 0 > 0 ? `-${changes?.removals}` : ''}
          </span>
        {/if}

        <!-- Lint counts -->
        {#if hasLintIssues && isComplete}
          <span class="text-[10px] {lintErrors > 0 ? 'text-red-500' : 'text-amber-500'}">
            ● {lintErrors > 0
              ? `${lintErrors} error${lintErrors !== 1 ? 's' : ''}`
              : ''}{lintErrors > 0 && lintWarnings > 0 ? ', ' : ''}{lintWarnings > 0
              ? `${lintWarnings} warning${lintWarnings !== 1 ? 's' : ''}`
              : ''}
          </span>
        {/if}
      </div>

      <!-- Metadata line -->
      {#if isComplete && !hasError}
        <span class="text-[10px] text-muted-foreground">
          {lineCount} lines{diagramType !== 'Unknown' ? ` • ${diagramType}` : ''}
        </span>
      {:else if isRunning && task.details}
        <span class="block truncate text-[10px] text-muted-foreground">{task.details}</span>
      {/if}
    </div>

    <!-- Expand/Collapse -->
    <div class="flex-shrink-0 text-muted-foreground">
      <ChevronDown
        class={`size-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
    </div>
  </button>

  <!-- Progress Bar -->
  {#if isRunning && task.progress > 0}
    <div class="h-0.5 bg-muted/30">
      <div
        class="h-full {progressColor} transition-all duration-300 ease-out"
        style="width: {task.progress}%">
      </div>
    </div>
  {/if}

  <!-- Partial Code Preview (during generation) -->
  {#if isRunning && task.metadata?.partialCode}
    <div class="border-t border-border bg-muted/10 p-2">
      <div class="mb-1 flex items-center justify-between">
        <span class="text-[9px] font-medium text-muted-foreground">
          {task.metadata.lineCount || 0} lines generated
        </span>
        <span class="text-[9px] text-muted-foreground">
          {Math.round(task.progress || 0)}%
        </span>
      </div>
      <div class="max-h-24 overflow-auto rounded border border-border bg-background p-2">
        <pre class="font-mono text-[9px] leading-relaxed text-foreground/80">{task.metadata
            .partialCode}</pre>
      </div>
    </div>
  {/if}

  <!-- Expanded Content -->
  {#if isExpanded}
    <div class="max-h-64 space-y-2 overflow-y-auto border-t border-border p-2.5">
      <!-- Changes Section -->
      {#if hasChanges}
        <div class="space-y-1 rounded-md bg-muted/20 p-2">
          <div class="mb-1 text-[10px] font-medium text-foreground">
            {isComplete ? 'Changes Made' : 'Live Changes'}
          </div>
          {#if changes && changes.additions > 0}
            <div class="font-mono text-[10px] text-green-600">
              + {changes.additions} addition{changes.additions !== 1 ? 's' : ''}
            </div>
          {/if}
          {#if changes && changes.removals > 0}
            <div class="font-mono text-[10px] text-red-600">
              - {changes.removals} removal{changes.removals !== 1 ? 's' : ''}
            </div>
          {/if}

          <!-- Detailed changes -->
          {#if streamedChanges.length > 0 && isComplete}
            <div class="mt-1.5 max-h-24 space-y-0.5 overflow-y-auto border-t border-border pt-1.5">
              {#each streamedChanges as change}
                <div
                  class="font-mono text-[9px] {change.type === 'add'
                    ? 'text-green-600'
                    : 'text-red-600'} truncate">
                  {change.line}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Lint Issues -->
      {#if hasLintIssues && lint?.issues}
        <div class="space-y-1">
          {#each lint.issues.filter((i) => i.severity === 'error') as issue, idx (idx)}
            <div class="flex items-start gap-1.5 rounded bg-red-500/10 p-1.5 text-red-500">
              <AlertCircle class="mt-0.5 size-3 flex-shrink-0" />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="rounded bg-black/10 px-1 font-mono text-[10px] dark:bg-white/10"
                    >L{issue.line}</span>
                  <span class="truncate text-[10px] font-medium">{issue.message}</span>
                </div>
              </div>
            </div>
          {/each}
          {#each lint.issues.filter((i) => i.severity === 'warning') as issue, idx (idx)}
            <div class="flex items-start gap-1.5 rounded bg-amber-500/10 p-1.5 text-amber-500">
              <AlertTriangle class="mt-0.5 size-3 flex-shrink-0" />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="rounded bg-black/10 px-1 font-mono text-[10px] dark:bg-white/10"
                    >L{issue.line}</span>
                  <span class="truncate text-[10px] font-medium">{issue.message}</span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else if isComplete && !hasError}
        <div class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <Check class="size-3" />
          <span class="text-[10px]">No syntax errors</span>
        </div>
      {/if}

      <!-- Error Details -->
      {#if hasError}
        <div class="flex items-start gap-1.5 rounded bg-red-500/10 p-1.5 text-red-500">
          <AlertCircle class="mt-0.5 size-3 flex-shrink-0" />
          <span class="text-[10px] font-medium">{task.details}</span>
        </div>
        {#if task.metadata?.canRetry && onRetry}
          <button type="button" onclick={onRetry} class="text-[10px] text-primary hover:underline">
            Retry
          </button>
        {/if}
      {/if}

      <!-- Code Preview -->
      {#if diagramCode && isComplete}
        <button
          type="button"
          onclick={() => (showCode = !showCode)}
          class="flex items-center gap-1.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground">
          <FileCode class="size-3" />
          <span>{showCode ? 'Hide' : 'Show'} code ({lineCount} lines)</span>
          <ChevronDown class={`size-3 transition-transform ${showCode ? 'rotate-180' : ''}`} />
        </button>

        {#if showCode}
          <div class="max-h-32 overflow-x-auto rounded bg-muted/30 p-1.5">
            <pre class="font-mono text-[9px] leading-relaxed text-foreground/80">{diagramCode}</pre>
          </div>
        {/if}
      {/if}

      <!-- Metadata -->
      {#if isComplete && !hasError}
        <div
          class="flex items-center gap-2 border-t border-border pt-1 text-[9px] text-muted-foreground">
          {#if diagramType !== 'Unknown'}
            <span>Type: {diagramType}</span>
            <span>•</span>
          {/if}
          <span>{lineCount} lines</span>
          {#if !hasLintIssues}
            <span>•</span>
            <span class="text-emerald-500">Valid</span>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>
