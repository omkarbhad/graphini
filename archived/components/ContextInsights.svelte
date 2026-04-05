<script lang="ts">
  import type { ConversationContext } from '$lib/chat/context-engine';
  import { Brain, History, AlertCircle, Target, ChevronDown, ChevronRight } from 'lucide-svelte';

  interface Props {
    context: ConversationContext | null;
    class?: string;
  }

  let { context, class: className }: Props = $props();

  let isExpanded = $state(false);
</script>

{#if context}
  <div class={`rounded-lg border bg-card text-card-foreground shadow-sm ${className || ''}`}>
    <div class="p-3 pb-2">
      <button
        onclick={() => (isExpanded = !isExpanded)}
        class="flex w-full items-center justify-between text-left transition-opacity hover:opacity-80">
        <div class="flex items-center gap-2">
          <Brain class="size-4 text-primary" />
          <h3 class="text-sm font-semibold">Context Insights</h3>
        </div>
        <div class="flex items-center gap-2">
          <span class="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
            {context.messageCount} msgs
          </span>
          {#if isExpanded}
            <ChevronDown class="size-4" />
          {:else}
            <ChevronRight class="size-4" />
          {/if}
        </div>
      </button>
    </div>

    {#if isExpanded}
      <div class="space-y-3 p-3 pt-0 text-sm">
        <!-- Mode -->
        <div class="flex items-start gap-2">
          <Target class="mt-0.5 size-4 text-muted-foreground" />
          <div class="flex-1">
            <div class="font-medium">Mode</div>
            <div class="text-muted-foreground">
              {context.mode === 'edit' ? 'Editing existing diagram' : 'Creating new diagram'}
            </div>
          </div>
        </div>

        <!-- Diagram Type -->
        {#if context.diagramType}
          <div class="flex items-start gap-2">
            <div class="mt-0.5 size-4 text-muted-foreground">📊</div>
            <div class="flex-1">
              <div class="font-medium">Diagram Type</div>
              <div class="text-muted-foreground capitalize">{context.diagramType}</div>
            </div>
          </div>
        {/if}

        <!-- User Intents -->
        {#if context.userIntents.length > 0}
          <div class="flex items-start gap-2">
            <Target class="mt-0.5 size-4 text-muted-foreground" />
            <div class="flex-1">
              <div class="font-medium">Recent Actions</div>
              <div class="mt-1 flex flex-wrap gap-1">
                {#each context.userIntents.slice(0, 5) as intent}
                  <span
                    class="rounded-md border border-border bg-background px-2 py-0.5 text-xs capitalize">
                    {intent}
                  </span>
                {/each}
              </div>
            </div>
          </div>
        {/if}

        <!-- Recent Changes -->
        {#if context.recentChanges.length > 0}
          <div class="flex items-start gap-2">
            <History class="mt-0.5 size-4 text-muted-foreground" />
            <div class="flex-1">
              <div class="font-medium">Recent Changes</div>
              <ul class="mt-1 space-y-1 text-xs text-muted-foreground">
                {#each context.recentChanges.slice(0, 3) as change}
                  <li>• {change}</li>
                {/each}
              </ul>
            </div>
          </div>
        {/if}

        <!-- Error History -->
        {#if context.errorHistory.length > 0}
          <div class="flex items-start gap-2">
            <AlertCircle class="mt-0.5 size-4 text-destructive" />
            <div class="flex-1">
              <div class="font-medium text-destructive">Recent Errors</div>
              <ul class="mt-1 space-y-1 text-xs text-muted-foreground">
                {#each context.errorHistory.slice(0, 2) as error}
                  <li class="line-clamp-2">• {error}</li>
                {/each}
              </ul>
            </div>
          </div>
        {/if}

        <!-- Conversation Summary -->
        {#if context.conversationSummary}
          <div class="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
            {context.conversationSummary}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}
