<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { NodeProps } from '@xyflow/svelte';
  import type { HandleDef } from '../../layout.js';

  interface C4NodeData {
    label: string;
    description?: string;
    technology?: string;
    bgColor?: string;
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
  const bg = $derived(c4.bgColor ?? '#438DD5');
  const text = $derived(c4.textColor ?? '#ffffff');
  const typeLabel = $derived(c4.typeLabel ?? 'Container');
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

<div class="node-wrapper" style="--bg: {bg}; --text: {text};">
  <div class="node-label">{c4.label}</div>
  <div class="node-type">[{typeLabel}{techSuffix}]</div>
  {#if c4.description}
    <div class="node-description">{c4.description}</div>
  {/if}
</div>

<style>
  .node-wrapper {
    background-color: var(--bg);
    color: var(--text);
    border-radius: 8px;
    padding: 14px 18px;
    min-width: 140px;
    max-width: 220px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
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
    opacity: 0.85;
  }

  .node-description {
    font-size: 11px;
    line-height: 1.4;
    margin-top: 5px;
    opacity: 0.9;
    word-break: break-word;
  }
</style>
