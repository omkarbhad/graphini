<script lang="ts">
  import CodeEditor from '$lib/components/ai-elements/CodeEditor.svelte';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
  } from '$lib/components/ui/collapsible/index.js';
  import * as CodeBlock from '$lib/features/chat/components/ai-elements/code/index.js';
  import { cn } from '$lib/utils';
  import {
    AlertCircle,
    BookOpen,
    Brain,
    CheckCircle,
    ChevronDown,
    ClipboardList,
    Code,
    Loader2,
    Pencil,
    Sparkles,
    Trash2,
    Wrench
  } from 'lucide-svelte';

  export type ToolExecutionStatus = 'starting' | 'in-progress' | 'complete' | 'error';

  export interface ToolStep {
    id: string;
    message: string;
    status: 'pending' | 'active' | 'complete';
    timestamp?: number;
  }

  export interface ToolExecutionProps {
    id: string;
    name: string;
    status: ToolExecutionStatus;
    message?: string;
    progress?: number;
    steps?: ToolStep[];
    streamingCode?: string;
    error?: string;
    isOpen?: boolean;
    onToggle?: () => void;
    onApply?: (code: string) => void;
    class?: string;
  }

  let {
    id,
    name,
    status = 'starting',
    message = '',
    progress = 0,
    steps = [],
    streamingCode = '',
    error = '',
    isOpen = $bindable(true),
    onToggle,
    onApply,
    class: className = ''
  }: ToolExecutionProps = $props();

  // Check if this is a diagram-related tool that should show code
  const isDiagramTool = $derived(
    name === 'create_diagram' || name.startsWith('diagram_editor') || name === 'diagram_editor'
  );

  // Determine if we're actively streaming (for live code display)
  const isActivelyStreaming = $derived(
    (status === 'starting' || status === 'in-progress') && isDiagramTool
  );

  // Line count for progress indication
  const lineCount = $derived(streamingCode ? streamingCode.split('\n').length : 0);

  // Tool icon mapping
  const toolIcons: Record<string, typeof Sparkles> = {
    create_diagram: Sparkles,
    diagram_editor: Pencil,
    read: BookOpen,
    update: Pencil,
    clear: Trash2,
    patch: Wrench,
    thinking: Brain,
    comprehensive_questionnaire: ClipboardList,
    default: Code
  };

  // Get the appropriate icon for the tool
  const getToolIcon = (toolName: string, operation?: string) => {
    if (operation && toolIcons[operation]) {
      return toolIcons[operation];
    }
    return toolIcons[toolName] || toolIcons['default'];
  };

  // Status colors and icons
  const statusConfig = $derived.by(() => {
    switch (status) {
      case 'starting':
        return {
          icon: Loader2,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
          label: 'Starting',
          animate: true
        };
      case 'in-progress':
        return {
          icon: Loader2,
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          borderColor: 'border-primary/20',
          label: 'Running',
          animate: true
        };
      case 'complete':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20',
          label: 'Complete',
          animate: false
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
          label: 'Error',
          animate: false
        };
      default:
        return {
          icon: Loader2,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/50',
          borderColor: 'border-border',
          label: 'Pending',
          animate: false
        };
    }
  });

  // Format tool name for display
  const displayName = $derived.by(() => {
    const nameMap: Record<string, string> = {
      create_diagram: 'Creating Diagram',
      diagram_editor: 'Diagram Editor',
      thinking: 'Analyzing',
      comprehensive_questionnaire: 'Gathering Requirements',
      read: 'Reading Diagram',
      update: 'Updating Diagram',
      clear: 'Clearing Diagram',
      patch: 'Patching Diagram'
    };
    return nameMap[name] || name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  });

  // Handle toggle
  const handleToggle = () => {
    isOpen = !isOpen;
    onToggle?.();
  };

  // Get operation from name if it's diagram_editor
  const operation = $derived.by(() => {
    if (name === 'diagram_editor' && message) {
      if (message.toLowerCase().includes('reading')) return 'read';
      if (message.toLowerCase().includes('creating')) return 'create';
      if (message.toLowerCase().includes('updating')) return 'update';
      if (message.toLowerCase().includes('clearing')) return 'clear';
      if (message.toLowerCase().includes('patching')) return 'patch';
    }
    return undefined;
  });

  const ToolIcon = $derived(getToolIcon(name, operation));
</script>

<Collapsible
  bind:open={isOpen}
  class={cn(
    'mb-3 rounded-lg border transition-all duration-200',
    statusConfig.borderColor,
    statusConfig.bgColor,
    className
  )}>
  <!-- Collapsed/Expanded Header -->
  <CollapsibleTrigger
    class="flex w-full items-center justify-between gap-3 rounded-lg p-3 transition-colors hover:bg-muted/30"
    onclick={handleToggle}>
    <div class="flex min-w-0 flex-1 items-center gap-3">
      <!-- Tool Icon with Status -->
      <div
        class={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
          statusConfig.bgColor
        )}>
        <ToolIcon class={cn('size-4', statusConfig.color)} />
      </div>

      <!-- Tool Name and Message -->
      <div class="flex min-w-0 flex-1 flex-col">
        <div class="flex items-center gap-2">
          <span class="truncate text-sm font-medium text-foreground">
            {displayName}
          </span>
          <Badge
            variant="secondary"
            class={cn('h-5 gap-1 px-1.5 py-0 text-[10px]', statusConfig.color)}>
            {@const StatusIcon = statusConfig.icon}
            <StatusIcon class={cn('size-3', statusConfig.animate && 'animate-spin')} />
            {statusConfig.label}
          </Badge>
        </div>
        {#if message && !isOpen}
          <span class="mt-0.5 truncate text-xs text-muted-foreground">
            {message}
          </span>
        {/if}
      </div>

      <!-- Progress Bar (collapsed view) -->
      {#if !isOpen && status === 'in-progress' && progress > 0}
        <div class="flex flex-shrink-0 items-center gap-2">
          <div class="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full bg-primary transition-all duration-300"
              style="width: {progress}%">
            </div>
          </div>
          <span class="w-8 text-[10px] text-muted-foreground">
            {progress}%
          </span>
        </div>
      {/if}
    </div>

    <!-- Chevron -->
    <ChevronDown
      class={cn(
        'size-4 flex-shrink-0 text-muted-foreground transition-transform duration-200',
        isOpen && 'rotate-180'
      )} />
  </CollapsibleTrigger>

  <!-- Expanded Content -->
  <CollapsibleContent
    class="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
    <div class="space-y-3 px-3 pt-1 pb-3">
      <!-- Current Message -->
      {#if message}
        {@const MessageIcon = statusConfig.icon}
        <div class="flex items-start gap-2">
          <MessageIcon
            class={cn(
              'mt-0.5 size-4 flex-shrink-0',
              statusConfig.color,
              statusConfig.animate && 'animate-spin'
            )} />
          <span class="text-sm text-foreground">
            {message}
          </span>
        </div>
      {/if}

      <!-- Progress Bar (expanded view) -->
      {#if status === 'in-progress' && progress > 0}
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-muted-foreground">Progress</span>
            <span class="font-medium text-foreground">{progress}%</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full bg-primary transition-all duration-300"
              style="width: {progress}%">
            </div>
          </div>
        </div>
      {/if}

      <!-- Steps List -->
      {#if steps.length > 0}
        <div class="space-y-1.5 pl-1">
          {#each steps as step (step.id)}
            <div class="flex items-center gap-2 text-xs">
              {#if step.status === 'complete'}
                <CheckCircle class="size-3 flex-shrink-0 text-green-500" />
              {:else if step.status === 'active'}
                <Loader2 class="size-3 flex-shrink-0 animate-spin text-primary" />
              {:else}
                <div class="size-3 flex-shrink-0 rounded-full border border-muted-foreground/30">
                </div>
              {/if}
              <span
                class={cn(
                  step.status === 'complete' && 'text-muted-foreground line-through',
                  step.status === 'active' && 'font-medium text-foreground',
                  step.status === 'pending' && 'text-muted-foreground'
                )}>
                {step.message}
              </span>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Live Streaming Code Area for Diagram Tools -->
      {#if isDiagramTool}
        <div class="space-y-1.5">
          <!-- Header with line count -->
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center gap-2 text-muted-foreground">
              <Code class="size-3" />
              <span>
                {#if isActivelyStreaming}
                  Generating Code{lineCount > 0 ? ` (${lineCount} lines)` : '...'}
                {:else}
                  Generated Code{lineCount > 0 ? ` (${lineCount} lines)` : ''}
                {/if}
              </span>
            </div>
            {#if status === 'complete' && streamingCode && onApply}
              <Button
                variant="ghost"
                size="sm"
                class="h-6 px-2 text-xs"
                onclick={() => onApply?.(streamingCode)}>
                <CheckCircle class="mr-1 size-3" />
                Apply
              </Button>
            {/if}
          </div>

          <!-- Code Display Area -->
          <div class="relative overflow-hidden rounded-md border border-border/50">
            {#if isActivelyStreaming && !streamingCode}
              <!-- Shimmer placeholder while waiting for first code chunk -->
              <div class="space-y-2 bg-muted/30 p-4">
                <div class="h-4 w-3/4 animate-pulse rounded bg-muted"></div>
                <div class="h-4 w-1/2 animate-pulse rounded bg-muted delay-75"></div>
                <div class="h-4 w-2/3 animate-pulse rounded bg-muted delay-150"></div>
                <div class="h-4 w-1/3 animate-pulse rounded bg-muted"></div>
                <div class="h-4 w-5/6 animate-pulse rounded bg-muted delay-75"></div>
              </div>
            {:else if streamingCode}
              <!-- Live code editor with streaming -->
              <CodeEditor
                code={streamingCode}
                language="mermaid"
                title={isActivelyStreaming ? 'Generating...' : 'Diagram Code'}
                isStreaming={isActivelyStreaming}
                showApply={status === 'complete' && !!onApply}
                onApply={() => onApply?.(streamingCode)} />
            {:else if status === 'complete'}
              <!-- Completed but no code (e.g., read operation) -->
              <div class="p-4 text-center text-sm text-muted-foreground">Operation completed</div>
            {/if}

            <!-- Streaming indicator overlay -->
            {#if isActivelyStreaming && streamingCode}
              <div
                class="absolute right-2 bottom-2 flex items-center gap-1.5 rounded-md border border-border/50 bg-background/80 px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm">
                <Loader2 class="size-3 animate-spin text-primary" />
                <span>Streaming...</span>
              </div>
            {/if}
          </div>
        </div>
      {:else if streamingCode}
        <!-- Non-diagram tools with code (fallback to CodeBlock) -->
        <div class="space-y-1.5">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <Code class="size-3" />
            <span>Generated Code</span>
          </div>
          <div class="overflow-hidden rounded-md border border-border/50">
            <CodeBlock.Root code={streamingCode} lang="mermaid" hideLines>
              <CodeBlock.CopyButton />
            </CodeBlock.Root>
          </div>
        </div>
      {/if}

      <!-- Error Message -->
      {#if error}
        <div class="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-2">
          <AlertCircle class="mt-0.5 size-4 flex-shrink-0 text-red-500" />
          <div class="min-w-0 flex-1">
            <span class="text-sm text-red-600 dark:text-red-400">
              {error}
            </span>
          </div>
        </div>
      {/if}
    </div>
  </CollapsibleContent>
</Collapsible>
