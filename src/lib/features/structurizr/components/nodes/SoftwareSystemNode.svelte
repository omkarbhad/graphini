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
  const bg = $derived(c4.bgColor ?? '#1168BD');
  const text = $derived(c4.textColor ?? '#ffffff');
  const typeLabel = $derived(c4.typeLabel ?? 'Software System');
</script>

<Handle type="target" position={Position.Top} />

<div class="node-wrapper" style="--bg: {bg}; --text: {text};">
  <div class="node-label">{c4.label}</div>
  <div class="node-type">[{typeLabel}]</div>
  {#if c4.description}
    <div class="node-description">{c4.description}</div>
  {/if}
</div>

<Handle type="source" position={Position.Bottom} />

<style>
  .node-wrapper {
    background-color: var(--bg);
    color: var(--text);
    border-radius: 10px;
    padding: 16px 20px;
    min-width: 160px;
    max-width: 240px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
  }

  .node-label {
    font-size: 14px;
    font-weight: 700;
    line-height: 1.3;
    word-break: break-word;
  }

  .node-type {
    font-size: 11px;
    font-style: italic;
    opacity: 0.85;
  }

  .node-description {
    font-size: 11px;
    line-height: 1.4;
    margin-top: 6px;
    opacity: 0.9;
    word-break: break-word;
  }
</style>
