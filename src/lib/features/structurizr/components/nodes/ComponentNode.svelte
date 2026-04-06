<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { NodeProps } from '@xyflow/svelte';

  interface C4NodeData {
    label: string;
    description?: string;
    technology?: string;
    bgColor?: string;
    textColor?: string;
    typeLabel?: string;
  }

  let { data }: NodeProps = $props();

  const c4 = $derived(data as unknown as C4NodeData);
  const bg = $derived(c4.bgColor ?? '#85BBF0');
  const text = $derived(c4.textColor ?? '#000000');
  const typeLabel = $derived(c4.typeLabel ?? 'Component');
  const techSuffix = $derived(c4.technology ? `: ${c4.technology}` : '');
</script>

<Handle type="target" position={Position.Top} id="top" />
<Handle type="source" position={Position.Right} id="right" />
<Handle type="target" position={Position.Left} id="left" />

<div class="node-wrapper" style="--bg: {bg}; --text: {text};">
  <div class="node-label">{c4.label}</div>
  <div class="node-type">[{typeLabel}{techSuffix}]</div>
  {#if c4.description}
    <div class="node-description">{c4.description}</div>
  {/if}
</div>

<Handle type="source" position={Position.Bottom} id="bottom" />

<style>
  .node-wrapper {
    background-color: var(--bg);
    color: var(--text);
    border-radius: 7px;
    padding: 10px 14px;
    min-width: 120px;
    max-width: 200px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
  }

  .node-label {
    font-size: 12px;
    font-weight: 700;
    line-height: 1.3;
    word-break: break-word;
  }

  .node-type {
    font-size: 10px;
    font-style: italic;
    opacity: 0.75;
  }

  .node-description {
    font-size: 10px;
    line-height: 1.4;
    margin-top: 4px;
    opacity: 0.85;
    word-break: break-word;
  }
</style>
