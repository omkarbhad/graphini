<script lang="ts">
  import '@xyflow/svelte/dist/style.css';
  import { SvelteFlow, Background, Controls, MiniMap, type Node, type Edge } from '@xyflow/svelte';
  import { mode } from 'mode-watcher';
  import { LayoutDashboard } from 'lucide-svelte';

  import { parseStructurizrDSL } from '../parser.js';
  import { getAvailableViews, transformToSvelteFlow, type ViewSummary } from '../transformer.js';
  import { applyElkLayout, normalizeDirection } from '../layout.js';
  import type { C4Workspace } from '../types.js';

  import ViewSelector from './ViewSelector.svelte';
  import PersonNode from './nodes/PersonNode.svelte';
  import SoftwareSystemNode from './nodes/SoftwareSystemNode.svelte';
  import ContainerNode from './nodes/ContainerNode.svelte';
  import ComponentNode from './nodes/ComponentNode.svelte';
  import DeploymentNode from './nodes/DeploymentNode.svelte';

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface Props {
    files: Record<string, string>;
    gridEnabled?: boolean;
  }

  let { files, gridEnabled = true }: Props = $props();

  // ---------------------------------------------------------------------------
  // Custom node types
  // ---------------------------------------------------------------------------

  const nodeTypes = {
    component: ComponentNode,
    container: ContainerNode,
    deploymentNode: DeploymentNode,
    person: PersonNode,
    softwareSystem: SoftwareSystemNode
  };

  // ---------------------------------------------------------------------------
  // Internal state
  // ---------------------------------------------------------------------------

  let nodes = $state<Node[]>([]);
  let edges = $state<Edge[]>([]);
  let workspace = $state<C4Workspace | null>(null);
  let parseError = $state<string | null>(null);
  let activeViewKey = $state<string>('');
  let availableViews = $state<ViewSummary[]>([]);
  let positionOverrides = $state<Record<string, { x: number; y: number }>>({});

  // ---------------------------------------------------------------------------
  // Data mapping helpers
  // ---------------------------------------------------------------------------

  /**
   * The transformer outputs nodes with `background`/`color` keys,
   * but the node components expect `bgColor`/`textColor`.
   * Remap here so the node components receive the correct prop names.
   */
  function remapNodeData(rawNodes: Node[]): Node[] {
    return rawNodes.map((node) => {
      const d = node.data as Record<string, unknown>;
      return {
        ...node,
        data: {
          ...d,
          bgColor: d['background'] ?? d['bgColor'],
          textColor: d['color'] ?? d['textColor']
        }
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Layout application
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // View rendering
  // ---------------------------------------------------------------------------

  async function renderView(
    ws: C4Workspace,
    viewKey: string,
    overrides: Record<string, { x: number; y: number }>
  ) {
    const view = ws.views.views.find((v) => v.key === viewKey);
    const direction = normalizeDirection(view?.autoLayout?.direction);

    const result = transformToSvelteFlow(ws, viewKey);
    const remapped = remapNodeData(result.nodes);
    const laid = await applyElkLayout(remapped, result.edges, { direction }, overrides);
    nodes = laid.nodes;
    edges = laid.edges;
  }

  // ---------------------------------------------------------------------------
  // Parse files effect — re-runs whenever `files` changes
  // ---------------------------------------------------------------------------

  $effect(() => {
    // Capture current files reference for this effect run
    const currentFiles = files;

    parseStructurizrDSL(currentFiles).then((result) => {
      if (result.error) {
        parseError = result.error.message;
        workspace = null;
        nodes = [];
        edges = [];
        availableViews = [];
        return;
      }

      parseError = null;
      workspace = result.workspace;

      if (!result.workspace) {
        nodes = [];
        edges = [];
        availableViews = [];
        return;
      }

      const views = getAvailableViews(result.workspace);
      availableViews = views;

      // Pick the first view if the current activeViewKey is no longer valid
      const validKey = views.some((v) => v.key === activeViewKey)
        ? activeViewKey
        : (views[0]?.key ?? '');

      if (validKey !== activeViewKey) {
        activeViewKey = validKey;
        positionOverrides = {};
      }

      if (validKey) {
        renderView(result.workspace, validKey, positionOverrides);
      } else {
        nodes = [];
        edges = [];
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Interaction handlers
  // ---------------------------------------------------------------------------

  function handleViewSelect(key: string) {
    if (key === activeViewKey) return;
    activeViewKey = key;
    positionOverrides = {};
    if (workspace) {
      renderView(workspace, key, {});
    }
  }

  function handleAutoLayout() {
    positionOverrides = {};
    if (workspace && activeViewKey) {
      renderView(workspace, activeViewKey, {});
    }
  }

  function handleNodeDragStop({
    nodes: draggedNodes
  }: {
    targetNode: Node | null;
    nodes: Node[];
    event: MouseEvent | TouchEvent;
  }) {
    const overrides = { ...positionOverrides };
    for (const node of draggedNodes) {
      overrides[node.id] = { ...node.position };
    }
    positionOverrides = overrides;
  }

  // ---------------------------------------------------------------------------
  // Color mode
  // ---------------------------------------------------------------------------

  const colorMode = $derived($mode === 'dark' ? 'dark' : 'light');
</script>

<!-- =========================================================================
  Error bar
========================================================================== -->
{#if parseError}
  <div class="error-bar" role="alert">
    <span class="error-label">Parse error:</span>
    {parseError}
  </div>
{/if}

<!-- =========================================================================
  Toolbar
========================================================================== -->
<div class="toolbar">
  <ViewSelector views={availableViews} {activeViewKey} onSelect={handleViewSelect} />

  <button
    type="button"
    class="auto-layout-btn"
    onclick={handleAutoLayout}
    title="Reset to auto layout">
    <LayoutDashboard class="size-3.5" />
    <span>Auto Layout</span>
  </button>
</div>

<!-- =========================================================================
  SvelteFlow canvas
========================================================================== -->
<div class="canvas-wrapper">
  <SvelteFlow
    bind:nodes
    bind:edges
    {nodeTypes}
    {colorMode}
    defaultEdgeOptions={{
      style: 'stroke: #94a3b8; stroke-width: 1.5px;',
      animated: false
    }}
    connectionMode="loose"
    fitView
    minZoom={0.05}
    maxZoom={4}
    onnodedragstop={handleNodeDragStop}>
    {#if gridEnabled}
      <Background />
    {/if}
    <Controls />
    <MiniMap />
  </SvelteFlow>
</div>

<style>
  :global(.canvas-wrapper .svelte-flow) {
    width: 100%;
    height: 100%;
  }

  .error-bar {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 8px 12px;
    background: hsl(0 84% 97%);
    border-bottom: 1px solid hsl(0 84% 85%);
    color: hsl(0 70% 40%);
    font-size: 12px;
    line-height: 1.5;
  }

  :global(.dark) .error-bar {
    background: hsl(0 40% 15%);
    border-bottom-color: hsl(0 40% 30%);
    color: hsl(0 80% 75%);
  }

  .error-label {
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-bottom: 1px solid var(--border, #e5e7eb);
    background: var(--background, #ffffff);
    min-height: 40px;
    flex-shrink: 0;
  }

  .auto-layout-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 28px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid var(--border, #e5e7eb);
    background: transparent;
    color: var(--foreground, #111827);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
  }

  .auto-layout-btn:hover {
    background: var(--muted, #f3f4f6);
  }

  .canvas-wrapper {
    flex: 1;
    min-height: 0;
    position: relative;
    width: 100%;
    height: 100%;
  }
</style>
