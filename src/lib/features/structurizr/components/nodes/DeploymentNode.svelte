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
  const text = $derived(c4.textColor ?? '#999999');
  const typeLabel = $derived(c4.typeLabel ?? 'Deployment Node');
  const techSuffix = $derived(c4.technology ? `: ${c4.technology}` : '');
</script>

<Handle type="target" position={Position.Top} />

<div class="node-wrapper" style="--text: {text};">
  <div class="node-label">{c4.label}</div>
  <div class="node-type">[{typeLabel}{techSuffix}]</div>
  {#if c4.description}
    <div class="node-description">{c4.description}</div>
  {/if}
</div>

<Handle type="source" position={Position.Bottom} />

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
