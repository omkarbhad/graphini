<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { NodeProps } from '@xyflow/svelte';
  import type { HandleDef } from '../../layout.js';

  interface C4NodeData {
    label: string;
    description?: string;
    technology?: string;
    textColor?: string;
    typeLabel?: string;
    handles?: HandleDef[];
  }

  const SIDE_TO_POSITION: Record<string, Position> = {
    bottom: Position.Bottom,
    left: Position.Left,
    right: Position.Right,
    top: Position.Top
  };

  function handleStyle(h: HandleDef): string {
    if (h.side === 'top') return `left: ${h.percent}%; top: 0; transform: translateX(-50%);`;
    if (h.side === 'bottom')
      return `left: ${h.percent}%; bottom: 0; top: auto; transform: translateX(-50%);`;
    if (h.side === 'left') return `top: ${h.percent}%; left: 0; transform: translateY(-50%);`;
    return `top: ${h.percent}%; right: 0; left: auto; transform: translateY(-50%);`;
  }

  let { data }: NodeProps = $props();

  const c4 = $derived(data as unknown as C4NodeData);
  const text = $derived(c4.textColor ?? '#999999');
  const typeLabel = $derived(c4.typeLabel ?? 'Deployment Node');
  const techSuffix = $derived(c4.technology ? `: ${c4.technology}` : '');
  const handles = $derived(c4.handles ?? []);
</script>

{#each handles as h (h.id)}
  <Handle
    type="source"
    position={SIDE_TO_POSITION[h.side]}
    id={h.id}
    class="c4-handle"
    style={handleStyle(h)} />
{/each}

<div class="node-wrapper" style="--text: {text};">
  <div class="node-label">{c4.label}</div>
  <div class="node-type">[{typeLabel}{techSuffix}]</div>
  {#if c4.description}
    <div class="node-description">{c4.description}</div>
  {/if}
</div>

<style>
  .node-wrapper {
    background-color: transparent;
    color: var(--text);
    border: 2px dashed #999999;
    border-radius: 8px;
    padding: 14px 18px;
    min-width: 160px;
    max-width: 280px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    box-shadow: none;
  }

  .node-label {
    font-size: 13px;
    font-weight: 700;
    line-height: 1.3;
    word-break: break-word;
  }

  .node-type {
    font-size: 10px;
    font-style: italic;
    opacity: 0.8;
  }

  .node-description {
    font-size: 11px;
    line-height: 1.4;
    margin-top: 5px;
    opacity: 0.75;
    word-break: break-word;
  }
</style>
