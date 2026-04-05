<script lang="ts">
  import FloatingToolbar from '$lib/components/FloatingToolbar.svelte';
  import { Separator } from '$lib/components/ui/separator';
  import { Toggle } from '$lib/components/ui/toggle';
  import * as ToggleGroup from '$lib/components/ui/toggle-group';
  import { defaultState, inputStateStore, setLayout, type LayoutOption } from '$/util/state';
  import type { MermaidConfig } from 'mermaid';
  import FlowchartIcon from '~icons/material-symbols/account-tree-outline-rounded';
  import RoughIcon from '~icons/material-symbols/draw-outline-rounded';
  import BackgroundIcon from '~icons/material-symbols/grid-4x4-rounded';
  import ElkIcon from '~icons/material-symbols/shape-line-outline';

  if ($inputStateStore.grid === undefined) {
    // Handle cases where old states were saved without grid option
    $inputStateStore.grid = defaultState.grid;
  }

  const getLayoutSelection = (configString: string): LayoutOption => {
    try {
      const config = JSON.parse(configString) as MermaidConfig;
      const layout = String((config as Record<string, unknown>).layout ?? 'dagre').toLowerCase();
      if (layout.startsWith('elk')) {
        return 'elk';
      }
    } catch {
      // ignore parse errors and fall back to default
    }
    return 'dagre';
  };

  let layoutValue = $state<LayoutOption>('dagre');

  $effect(() => {
    layoutValue = getLayoutSelection($inputStateStore.mermaid);
  });

  const isLayoutOption = (value: string): value is LayoutOption =>
    value === 'dagre' || value === 'elk';

  const onLayoutChange = (value: string) => {
    const next = isLayoutOption(value) ? value : 'dagre';
    if (next !== getLayoutSelection($inputStateStore.mermaid)) {
      setLayout(next);
    }
  };
</script>

<FloatingToolbar>
  <Toggle
    bind:pressed={$inputStateStore.rough}
    size="sm"
    title="Hand-Drawn"
    class="transition-all duration-200 hover:scale-105">
    <RoughIcon />
  </Toggle>
  <Toggle
    bind:pressed={$inputStateStore.grid}
    size="sm"
    title="Background Grid"
    class="transition-all duration-200 hover:scale-105">
    <BackgroundIcon />
  </Toggle>
  <Separator orientation="vertical" class="hidden sm:block" />
  <ToggleGroup.Root
    type="single"
    size="sm"
    value={layoutValue}
    class="hidden transition-all duration-200 lg:flex"
    onValueChange={onLayoutChange}
    aria-label="Diagram layout">
    <ToggleGroup.Item value="dagre" class="gap-2 transition-all duration-200 hover:scale-105">
      <FlowchartIcon />
      <span class="text-xs font-medium">Dagre</span>
    </ToggleGroup.Item>
    <ToggleGroup.Item value="elk" class="gap-2 transition-all duration-200 hover:scale-105">
      <ElkIcon />
      <span class="text-xs font-medium">ELK</span>
    </ToggleGroup.Item>
  </ToggleGroup.Root>
</FloatingToolbar>
