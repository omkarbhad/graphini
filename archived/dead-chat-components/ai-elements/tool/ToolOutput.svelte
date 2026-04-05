<script lang="ts">
  import { AnalysisMetricBadge } from '$lib/components/ui/analysis-metric-badge/index.js';
  import { AnalysisProgress } from '$lib/components/ui/analysis-progress/index.js';
  import * as Code from '$lib/features/chat/components/ai-elements/code/index.js';
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';
  import type { SupportedLanguage } from '../code/shiki';

  interface ToolOutputProps {
    class?: string;
    output?: any;
    errorText?: string;
    children?: Snippet;
    toolType?: string;
    analysisData?: AnalysisData;
    isLoading?: boolean;
    progress?: number;
    [key: string]: any;
  }

  interface AnalysisData {
    executionTime?: number;
    confidence?: number;
    complexity?: 'low' | 'medium' | 'high';
    insights?: string[];
    metrics?: Record<string, number>;
    recommendations?: string[];
  }

  let {
    class: className = '',
    output,
    errorText,
    children,
    toolType = '',
    analysisData,
    isLoading = false,
    progress = 0,
    ...restProps
  }: ToolOutputProps = $props();

  let shouldRender = $derived.by(() => {
    return !!(output || errorText || analysisData || isLoading);
  });
  type OutputComp = {
    type: 'code' | 'text';
    content: string;
    language: SupportedLanguage;
  };

  let outputComponent: OutputComp | null = $derived.by(() => {
    if (!output) return null;

    if (typeof output === 'object') {
      return {
        type: 'code',
        content: JSON.stringify(output, null, 2),
        language: 'json'
      };
    } else if (typeof output === 'string') {
      return {
        type: 'code',
        content: output,
        language: 'json'
      };
    } else {
      return {
        type: 'text',
        content: String(output),
        language: 'text'
      };
    }
  });

  let id = $props.id();
</script>

{#if shouldRender}
  <div {id} class={cn('space-y-4 p-4', className)} {...restProps}>
    {#if isLoading}
      <AnalysisProgress isLoading={true} {progress} label="Running analysis..." />
    {/if}

    {#if analysisData && analysisData.insights && !isLoading}
      <div
        class="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4 transition-all duration-300 hover:shadow-sm dark:border-primary/30 dark:bg-primary/10">
        <h5
          class="mb-3 flex items-center gap-2 text-sm font-semibold text-primary dark:text-primary-foreground">
          <span class="h-2 w-2 animate-pulse rounded-full bg-primary"></span>
          Analysis Insights
        </h5>
        <ul class="space-y-2 text-sm text-muted-foreground">
          {#each analysisData.insights as insight, index}
            <li
              class="animate-fade-in flex items-start gap-2"
              style="animation-delay: {index * 100}ms">
              <span class="mt-2 h-1 w-1.5 flex-shrink-0 rounded-full bg-primary/60"></span>
              <span class="leading-relaxed">{insight}</span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    <h4 class="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {errorText ? 'Error' : 'Result'}
    </h4>
    <div
      class={cn(
        'overflow-x-auto rounded-md text-xs [&_table]:w-full',
        errorText ? 'bg-destructive/10 text-destructive' : 'bg-muted/50 text-foreground'
      )}>
      {#if errorText}
        <div class="p-3">{errorText}</div>
      {:else if outputComponent}
        {#if outputComponent.type === 'code'}
          <Code.Root code={outputComponent.content} lang={outputComponent.language} hideLines>
            <Code.CopyButton />
          </Code.Root>
        {:else}
          <div class="p-3">{outputComponent.content}</div>
        {/if}
      {/if}
    </div>

    {#if analysisData && !isLoading}
      <div class="animate-fade-in mt-4 space-y-3 border-t border-border pt-4">
        <div class="flex flex-wrap gap-2">
          {#if analysisData.executionTime}
            <AnalysisMetricBadge
              variant="execution"
              value={`${analysisData.executionTime}ms`}
              label="Execution time" />
          {/if}
          {#if analysisData.confidence}
            <AnalysisMetricBadge
              variant="confidence"
              value={`${Math.round(analysisData.confidence * 100)}%`}
              label="Confidence" />
          {/if}
          {#if analysisData.complexity}
            <AnalysisMetricBadge
              variant="complexity"
              value={analysisData.complexity}
              label="Complexity" />
          {/if}
        </div>
        {#if analysisData.recommendations && analysisData.recommendations.length > 0}
          <div class="space-y-2">
            <h6 class="flex items-center gap-2 text-sm font-medium text-foreground">
              <AnalysisMetricBadge variant="warning" size="sm" value="" label="Recommendations" />
              Recommendations
            </h6>
            <ul class="ml-4 space-y-1 text-sm text-muted-foreground">
              {#each analysisData.recommendations as rec, index}
                <li class="animate-fade-in relative" style="animation-delay: {index * 50}ms">
                  • {rec}
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }
</style>
