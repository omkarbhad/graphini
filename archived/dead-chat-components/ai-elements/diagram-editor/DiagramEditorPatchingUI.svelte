<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Check, Code, GitBranch, RefreshCw, Target, X, Zap } from 'lucide-svelte';
  import type { DiagramEditorTaskType, DiagramPatch } from './types';

  interface Props {
    patchingTask: DiagramEditorTaskType;
    onAcceptPatch?: (patch: DiagramPatch) => void;
    onRejectPatch?: (patch: DiagramPatch) => void;
    onRetry?: () => void;
  }

  let { patchingTask, onAcceptPatch, onRejectPatch, onRetry }: Props = $props();

  function getPatchIcon(type: string) {
    if (type.startsWith('node')) return Target;
    if (type.startsWith('style')) return Zap;
    if (type.startsWith('connection')) return GitBranch;
    return Code;
  }

  function getPatchColor(type: string) {
    if (type.startsWith('node')) return 'text-purple-500';
    if (type.startsWith('style')) return 'text-orange-500';
    if (type.startsWith('connection')) return 'text-blue-500';
    return 'text-gray-500';
  }

  const currentPatch = $derived(patchingTask.metadata?.currentPatch);
  const patchProgress = $derived((patchingTask.metadata?.patchIndex || 0) + 1);
  const totalPatches = $derived(patchingTask.metadata?.totalPatches || 1);
  const progressPercentage = $derived(Math.round((patchProgress / totalPatches) * 100));
</script>

<div class="space-y-4 rounded-lg border bg-gradient-to-br from-card to-card/80 p-4">
  <!-- Patch progress header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div
        class="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm">
        <GitBranch class="size-4 text-white" />
      </div>
      <div>
        <span class="text-sm font-medium">Applying Patches</span>
        <Badge variant="secondary" class="ml-2 text-xs">{patchProgress}/{totalPatches}</Badge>
      </div>
    </div>

    <div class="flex items-center gap-3 text-sm text-muted-foreground">
      {#if patchingTask.metadata?.appliedCount}
        <div class="flex items-center gap-1">
          <Check class="size-3 text-green-500" />
          <span>{patchingTask.metadata.appliedCount} applied</span>
        </div>
      {/if}

      {#if patchingTask.metadata?.failedCount}
        <div class="flex items-center gap-1">
          <X class="size-3 text-red-500" />
          <span>{patchingTask.metadata.failedCount} failed</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Overall progress bar -->
  <div class="space-y-1">
    <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500 ease-out"
        style="width: {progressPercentage}%">
      </div>
    </div>
    <div class="flex justify-between text-xs text-muted-foreground">
      <span>{progressPercentage}% complete</span>
      <span>{patchProgress} of {totalPatches} patches</span>
    </div>
  </div>

  <!-- Current patch details -->
  {#if currentPatch}
    {@const PatchIcon = getPatchIcon(currentPatch.type)}
    {@const patchColor = getPatchColor(currentPatch.type)}
    <div class="space-y-3 rounded-lg border bg-background/50 p-4">
      <div class="flex items-center gap-2">
        <svelte:component this={PatchIcon} class="size-4 {patchColor}" />
        <span class="text-sm font-medium capitalize">{currentPatch.type.replace(/_/g, ' ')}</span>

        {#if 'target' in currentPatch && currentPatch.target}
          <Badge variant="outline" class="text-xs">{currentPatch.target}</Badge>
        {/if}

        {#if patchingTask.status === 'in-progress'}
          <div class="ml-auto size-2 animate-pulse rounded-full bg-emerald-500"></div>
        {/if}
      </div>

      <!-- Patch content preview -->
      {#if 'content' in currentPatch && currentPatch.content}
        <div class="rounded-lg border bg-muted/50 p-3">
          <pre
            class="font-mono text-xs break-all whitespace-pre-wrap text-foreground">{currentPatch.content}</pre>
        </div>
      {/if}

      <!-- Style properties -->
      {#if 'properties' in currentPatch && currentPatch.properties}
        <div class="space-y-2">
          <span class="text-xs font-medium text-muted-foreground">Properties:</span>
          <div class="flex flex-wrap gap-2">
            {#each Object.entries(currentPatch.properties) as [key, value]}
              <Badge variant="secondary" class="font-mono text-xs">
                {key}: {value}
              </Badge>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Patch actions (if interactive) -->
      {#if onAcceptPatch && onRejectPatch && patchingTask.status === 'in-progress'}
        <div class="flex gap-2 pt-2">
          <Button size="sm" class="h-7" onclick={() => onAcceptPatch(currentPatch)}>
            <Check class="mr-1.5 size-3" />
            Apply
          </Button>
          <Button
            size="sm"
            variant="outline"
            class="h-7"
            onclick={() => onRejectPatch(currentPatch)}>
            <X class="mr-1.5 size-3" />
            Skip
          </Button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Live code preview -->
  {#if patchingTask.metadata?.partialCode}
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <Code class="size-3 text-muted-foreground" />
        <span class="text-xs font-medium text-muted-foreground">Live Preview</span>
        <div class="size-1.5 animate-pulse rounded-full bg-green-500"></div>
      </div>
      <div class="max-h-48 overflow-auto rounded-lg border bg-muted/50 p-3">
        <pre class="font-mono text-xs whitespace-pre-wrap text-foreground">{patchingTask.metadata
            .partialCode}</pre>
      </div>
    </div>
  {/if}

  <!-- Patch errors -->
  {#if patchingTask.metadata?.patchErrors && patchingTask.metadata.patchErrors.length > 0}
    <div class="space-y-2">
      <span class="text-xs font-medium text-red-600">Errors:</span>
      {#each patchingTask.metadata.patchErrors as patchError}
        <div
          class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs dark:border-red-800 dark:bg-red-950">
          <X class="mt-0.5 size-3 flex-shrink-0 text-red-500" />
          <div>
            <span class="font-medium text-red-700 dark:text-red-300">{patchError.patch.type}:</span>
            <span class="ml-1 text-red-600 dark:text-red-400">{patchError.error}</span>
            {#if patchError.canContinue}
              <p class="mt-1 text-red-500/70">Continuing with remaining patches...</p>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Retry button for errors -->
  {#if patchingTask.status === 'error' && onRetry}
    <div class="pt-2">
      <Button size="sm" variant="outline" class="h-7" onclick={onRetry}>
        <RefreshCw class="mr-1.5 size-3" />
        Retry Patches
      </Button>
    </div>
  {/if}
</div>
