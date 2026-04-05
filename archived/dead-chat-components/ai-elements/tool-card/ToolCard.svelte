<script lang="ts">
  import {
    AlertCircle,
    AlertTriangle,
    Check,
    ChevronDown,
    Edit3,
    Eye,
    FileCode,
    GitBranch,
    Loader2,
    Sparkles,
    Trash2
  } from 'lucide-svelte';

  type ToolStatus = 'idle' | 'running' | 'complete' | 'error';
  type ToolType = 'read' | 'create' | 'update' | 'clear' | 'patch' | 'thinking' | 'questionnaire';

  interface Change {
    type: 'add' | 'remove';
    line: string;
  }

  interface Props {
    title: string;
    status: ToolStatus;
    type?: ToolType;
    message?: string;
    progress?: number;
    additions?: number;
    removals?: number;
    errors?: number;
    warnings?: number;
    changes?: Change[];
    code?: string;
    lineCount?: number;
    diagramType?: string;
  }

  let {
    title,
    status,
    type = 'create',
    message = '',
    progress = 0,
    additions = 0,
    removals = 0,
    errors = 0,
    warnings = 0,
    changes = [],
    code = '',
    lineCount = 0,
    diagramType = ''
  }: Props = $props();

  let isExpanded = $state(false);
  let showCode = $state(false);

  // Derived values
  const hasChanges = $derived(additions > 0 || removals > 0);
  const hasIssues = $derived(errors > 0 || warnings > 0);
  const isRunning = $derived(status === 'running');
  const isComplete = $derived(status === 'complete');
  const hasError = $derived(status === 'error');

  // Status colors
  const statusColor = $derived(
    isRunning
      ? 'text-blue-500'
      : hasError
        ? 'text-red-500'
        : errors > 0
          ? 'text-red-500'
          : warnings > 0
            ? 'text-amber-500'
            : 'text-emerald-500'
  );

  const bgColor = $derived(
    isRunning
      ? 'bg-blue-500/5 border-blue-500/20'
      : hasError
        ? 'bg-red-500/5 border-red-500/20'
        : errors > 0
          ? 'bg-red-500/5 border-red-500/20'
          : warnings > 0
            ? 'bg-amber-500/5 border-amber-500/20'
            : 'bg-emerald-500/5 border-emerald-500/20'
  );

  const progressColor = $derived(
    isRunning
      ? 'bg-blue-500'
      : hasError
        ? 'bg-red-500'
        : errors > 0
          ? 'bg-red-500'
          : warnings > 0
            ? 'bg-amber-500'
            : 'bg-emerald-500'
  );

  function getIcon() {
    switch (type) {
      case 'read':
        return Eye;
      case 'create':
        return Sparkles;
      case 'update':
        return Edit3;
      case 'clear':
        return Trash2;
      case 'patch':
        return GitBranch;
      default:
        return Sparkles;
    }
  }

  const IconComponent = $derived(getIcon());
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
      {:else if hasError || errors > 0}
        <AlertCircle class="size-4 {statusColor}" />
      {:else if warnings > 0}
        <AlertTriangle class="size-4 {statusColor}" />
      {:else}
        <Check class="size-4 {statusColor}" />
      {/if}
    </div>

    <!-- Title & Status -->
    <div class="min-w-0 flex-1 text-left">
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium {statusColor} truncate">{title}</span>

        <!-- Change counts in header -->
        {#if hasChanges}
          <span class="text-[10px] text-muted-foreground">
            ● {additions > 0 ? `+${additions}` : ''}{additions > 0 && removals > 0
              ? ', '
              : ''}{removals > 0 ? `-${removals}` : ''}
          </span>
        {/if}

        <!-- Issue counts in header -->
        {#if hasIssues && isComplete}
          <span class="text-[10px] {errors > 0 ? 'text-red-500' : 'text-amber-500'}">
            ● {errors > 0 ? `${errors} error${errors !== 1 ? 's' : ''}` : ''}{errors > 0 &&
            warnings > 0
              ? ', '
              : ''}{warnings > 0 ? `${warnings} warning${warnings !== 1 ? 's' : ''}` : ''}
          </span>
        {/if}
      </div>

      <!-- Status message -->
      {#if message}
        <span class="block truncate text-[10px] text-muted-foreground">{message}</span>
      {:else if isComplete && !hasError}
        <span class="text-[10px] text-muted-foreground">
          {lineCount > 0 ? `${lineCount} lines` : ''}{lineCount > 0 && diagramType
            ? ' • '
            : ''}{diagramType}
        </span>
      {/if}
    </div>

    <!-- Expand/Collapse -->
    <div class="flex-shrink-0 text-muted-foreground">
      <ChevronDown
        class={`size-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
    </div>
  </button>

  <!-- Progress Bar -->
  {#if isRunning && progress > 0}
    <div class="h-0.5 bg-muted/30">
      <div
        class="h-full {progressColor} transition-all duration-300 ease-out"
        style="width: {progress}%">
      </div>
    </div>
  {/if}

  <!-- Expanded Content -->
  {#if isExpanded}
    <div class="space-y-2 border-t border-border p-2.5">
      <!-- Changes Section -->
      {#if hasChanges}
        <div class="space-y-1 rounded-md bg-muted/20 p-2">
          <div class="mb-1 text-[10px] font-medium text-foreground">
            {isComplete ? 'Changes Made' : 'Live Changes'}
          </div>
          {#if additions > 0}
            <div class="font-mono text-[10px] text-green-600">
              + {additions} addition{additions !== 1 ? 's' : ''}
            </div>
          {/if}
          {#if removals > 0}
            <div class="font-mono text-[10px] text-red-600">
              - {removals} removal{removals !== 1 ? 's' : ''}
            </div>
          {/if}

          <!-- Detailed changes -->
          {#if changes.length > 0 && isComplete}
            <div class="mt-1.5 max-h-24 space-y-0.5 overflow-y-auto border-t border-border pt-1.5">
              {#each changes as change}
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

      <!-- Code Preview -->
      {#if code && isComplete}
        <button
          type="button"
          onclick={() => (showCode = !showCode)}
          class="flex items-center gap-1.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground">
          <FileCode class="size-3" />
          <span>{showCode ? 'Hide' : 'Show'} code ({lineCount} lines)</span>
          <ChevronDown class={`size-3 transition-transform ${showCode ? 'rotate-180' : ''}`} />
        </button>

        {#if showCode}
          <div class="max-h-32 overflow-x-auto rounded bg-muted/30 p-2">
            <pre class="font-mono text-[9px] leading-relaxed text-foreground/80">{code}</pre>
          </div>
        {/if}
      {/if}

      <!-- Metadata -->
      {#if isComplete && (diagramType || lineCount > 0)}
        <div
          class="flex items-center gap-2 border-t border-border pt-1 text-[9px] text-muted-foreground">
          {#if diagramType}
            <span>Type: {diagramType}</span>
          {/if}
          {#if diagramType && lineCount > 0}
            <span>•</span>
          {/if}
          {#if lineCount > 0}
            <span>{lineCount} lines</span>
          {/if}
          {#if !hasError && errors === 0}
            <span>•</span>
            <span class="text-emerald-500">Valid</span>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>
