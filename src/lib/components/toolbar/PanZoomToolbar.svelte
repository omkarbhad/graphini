<script lang="ts">
  import { inputStateStore, updateCodeStore, urlsStore } from '$/util/state';
  import { Button } from '$lib/components/ui/button';
  import type { PanZoomState } from '$lib/features/diagram/panZoom';
  import { ArrowDown, ArrowRight } from 'lucide-svelte';
  import { onDestroy, onMount } from 'svelte';
  import { get } from 'svelte/store';
  import LayoutIcon from '~icons/material-symbols/dashboard-customize-outline-rounded';
  import ExpandIcon from '~icons/material-symbols/open-in-full-rounded';
  import ArrowsToCircleIcon from '~icons/material-symbols/screenshot-frame-2';
  import MagnifyingGlassPlusIcon from '~icons/material-symbols/zoom-in-rounded';
  import MagnifyingGlassMinusIcon from '~icons/material-symbols/zoom-out-rounded';

  let { panZoomState }: { panZoomState: PanZoomState } = $props();

  let showLayoutDropdown = $state(false);
  let toolbarEl: HTMLDivElement | undefined = $state(undefined);

  function handleClickOutside(e: MouseEvent) {
    if (toolbarEl && !toolbarEl.contains(e.target as Node)) {
      showLayoutDropdown = false;
    }
  }

  onMount(() => document.addEventListener('mousedown', handleClickOutside));
  onDestroy(() => document.removeEventListener('mousedown', handleClickOutside));

  function changeDirection(dir: string) {
    const code = get(inputStateStore).code || '';
    const lines = code.split('\n');
    if (lines.length === 0) return;
    const first = lines[0].trim();
    // Match flowchart/graph direction declarations
    const dirMatch = first.match(/^(flowchart|graph)\s+(TD|TB|LR|RL|BT)/i);
    if (dirMatch) {
      lines[0] = lines[0].replace(/^(\s*(?:flowchart|graph)\s+)(TD|TB|LR|RL|BT)/i, `$1${dir}`);
      updateCodeStore({ code: lines.join('\n') });
    }
    showLayoutDropdown = false;
  }

  // Detect current direction from code
  let currentDirection = $derived.by(() => {
    const code = get(inputStateStore).code || '';
    const match = code.match(/^(?:flowchart|graph)\s+(TD|TB|LR|RL|BT)/im);
    return match ? match[1] : 'TD';
  });
</script>

<div
  bind:this={toolbarEl}
  class="pointer-events-auto absolute bottom-4 left-4 z-40 flex items-center gap-1 rounded-xl border border-border bg-card/70 px-2 py-2 backdrop-blur transition-colors hover:bg-card supports-[backdrop-filter]:bg-card/60">
  <!-- Reset View -->
  <Button
    variant="ghost"
    size="icon"
    title="Reset view — fit diagram to canvas"
    class="h-8 w-8 text-muted-foreground/70 transition-colors duration-200 hover:bg-muted/50 hover:text-foreground"
    onclick={() => panZoomState.reset()}>
    <ArrowsToCircleIcon class="size-4" />
  </Button>

  <!-- Zoom Controls -->
  <div class="flex items-center gap-1">
    <Button
      variant="ghost"
      size="icon"
      class="hidden h-7 w-7 text-muted-foreground/70 transition-colors duration-200 hover:bg-muted/50 hover:text-foreground sm:flex"
      title="Zoom out"
      onclick={() => panZoomState.zoomOut()}>
      <MagnifyingGlassMinusIcon class="size-3.5" />
    </Button>

    <div class="hidden items-center px-1 sm:flex">
      <div class="h-4 w-px bg-border/40"></div>
    </div>

    <Button
      variant="ghost"
      size="icon"
      class="hidden h-7 w-7 text-muted-foreground/70 transition-colors duration-200 hover:bg-muted/50 hover:text-foreground sm:flex"
      title="Zoom in"
      onclick={() => panZoomState.zoomIn()}>
      <MagnifyingGlassPlusIcon class="size-3.5" />
    </Button>
  </div>

  <!-- Separator -->
  <div class="hidden h-4 w-px bg-border/40 sm:flex"></div>

  <!-- Layout Direction Dropdown -->
  <div class="relative">
    <Button
      variant="ghost"
      size="icon"
      title="Change diagram layout direction"
      class="h-8 w-8 text-muted-foreground/70 transition-colors duration-200 hover:bg-muted/50 hover:text-foreground"
      onclick={() => (showLayoutDropdown = !showLayoutDropdown)}>
      <LayoutIcon class="size-4" />
    </Button>
    {#if showLayoutDropdown}
      <div
        class="absolute bottom-full left-1/2 z-50 mb-2 w-36 -translate-x-1/2 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl">
        <p
          class="mb-1 px-2 text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
          Layout
        </p>
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors {currentDirection ===
            'TB' || currentDirection === 'TD'
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
          title="Top to Bottom — nodes flow downward"
          onclick={() => changeDirection('TD')}>
          <ArrowDown class="size-3.5" />
          Top to Bottom
        </button>
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors {currentDirection ===
          'LR'
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
          title="Left to Right — nodes flow rightward"
          onclick={() => changeDirection('LR')}>
          <ArrowRight class="size-3.5" />
          Left to Right
        </button>
      </div>
    {/if}
  </div>

  <!-- Separator -->
  <div class="hidden h-4 w-px bg-border/40 sm:flex"></div>

  <!-- Full Screen -->
  <Button
    variant="ghost"
    size="icon"
    title="Open diagram in full screen view"
    class="h-8 w-8 text-muted-foreground/70 transition-colors duration-200 hover:bg-muted/50 hover:text-foreground"
    href={$urlsStore.view}
    target="_blank">
    <ExpandIcon class="size-4" />
  </Button>
</div>
