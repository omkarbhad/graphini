<script lang="ts">
  import * as Code from '$lib/components/ai-elements/code/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { cn } from '$lib/utils';
  import { MCPIconResults } from './MCPIconResults.svelte';
  import type { MCPValidationResult } from './index.js';

  interface MCPOutputProps {
    output?: any;
    errorText?: string;
    class?: string;
    [key: string]: any;
  }

  let { output, errorText, class: className = '', ...restProps }: MCPOutputProps = $props();

  let shouldRender = $derived.by(() => {
    return !!(output || errorText);
  });

  // Determine output type and render accordingly
  let outputType = $derived.by(() => {
    if (!output) return null;
    if (typeof output === 'object' && output.type) {
      return output.type;
    }
    return 'default';
  });

  function renderCustomOutput() {
    switch (outputType) {
      case 'icon-search-results':
        return renderIconSearchResults(output);
      case 'available-icons':
        return renderAvailableIcons(output);
      case 'validation-result':
        return renderValidationResult(output);
      case 'icon-suggestions':
        return renderIconSuggestions(output);
      default:
        return renderDefaultOutput();
    }
  }

  function renderIconSearchResults(data: any) {
    return {
      type: 'custom',
      content: MCPIconResults,
      props: {
        results: data.icons || [],
        selectable: true
      }
    };
  }

  function renderAvailableIcons(data: any) {
    return {
      type: 'summary',
      content: `
Total Available Icons: ${data.count}

Categories:
${data.categories.map((cat: string) => `• ${cat}`).join('\n')}
			`.trim()
    };
  }

  function renderValidationResult(data: MCPValidationResult) {
    return {
      type: 'validation',
      content: {
        valid: data.valid,
        iconPath: data.iconPath,
        suggestedAlternative: data.suggestedAlternative
      }
    };
  }

  function renderIconSuggestions(data: any) {
    return {
      type: 'suggestions',
      content: data.suggestions || []
    };
  }

  function renderDefaultOutput() {
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
        language: 'text'
      };
    } else {
      return {
        type: 'text',
        content: String(output)
      };
    }
  }

  let renderedOutput = $derived.by(() => {
    if (!output) return null;
    return renderCustomOutput();
  });
</script>

{#if shouldRender}
  <div class={cn('space-y-2 p-4', className)} {...restProps}>
    <h4 class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {errorText ? 'Error' : 'Result'}
    </h4>

    <div
      class={cn(
        'overflow-x-auto rounded-md text-xs',
        errorText ? 'bg-destructive/10 text-destructive' : 'bg-muted/50 text-foreground'
      )}>
      {#if errorText}
        <div class="p-3">{errorText}</div>
      {:else if renderedOutput}
        {#if renderedOutput.type === 'custom'}
          <svelte:component this={renderedOutput.content} {...renderedOutput.props} />
        {:else if renderedOutput.type === 'validation'}
          <div class="space-y-2 p-3">
            <div class="flex items-center gap-2">
              {#if renderedOutput.content.valid}
                <div class="h-2 w-2 rounded-full bg-green-500"></div>
                <span class="font-medium text-green-700">Icon Valid ✓</span>
              {:else}
                <div class="h-2 w-2 rounded-full bg-red-500"></div>
                <span class="font-medium text-red-700">Icon Invalid ✗</span>
              {/if}
            </div>
            {#if renderedOutput.content.iconPath}
              <div class="text-xs text-muted-foreground">
                Path: {renderedOutput.content.iconPath}
              </div>
            {/if}
            {#if renderedOutput.content.suggestedAlternative}
              <div class="text-xs text-blue-600">
                Suggested: {renderedOutput.content.suggestedAlternative}
              </div>
            {/if}
          </div>
        {:else if renderedOutput.type === 'suggestions'}
          <div class="space-y-2 p-3">
            {#each renderedOutput.content as suggestion}
              <div class="flex items-center justify-between rounded border bg-background p-2">
                <div>
                  <span class="font-medium">{suggestion.name}</span>
                  {#if suggestion.reason}
                    <span class="ml-2 text-xs text-muted-foreground">({suggestion.reason})</span>
                  {/if}
                </div>
                {#if suggestion.confidence}
                  <Badge variant="secondary" class="text-xs">
                    {Math.round(suggestion.confidence * 100)}%
                  </Badge>
                {/if}
              </div>
            {/each}
          </div>
        {:else if renderedOutput.type === 'summary'}
          <div class="p-3">
            <pre class="text-xs whitespace-pre-wrap">{renderedOutput.content}</pre>
          </div>
        {:else if renderedOutput.type === 'code'}
          <Code.Root code={renderedOutput.content} lang={renderedOutput.language} hideLines>
            <Code.CopyButton />
          </Code.Root>
        {:else if renderedOutput.type === 'text'}
          <div class="p-3">{renderedOutput.content}</div>
        {/if}
      {/if}
    </div>
  </div>
{/if}
