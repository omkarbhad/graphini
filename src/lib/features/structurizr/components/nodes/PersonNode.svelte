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
  const bg = $derived(c4.bgColor ?? '#08427B');
  const text = $derived(c4.textColor ?? '#ffffff');
  const typeLabel = $derived(c4.typeLabel ?? 'Person');
</script>

<Handle
  type="source"
  position={Position.Top}
  id="top"
  style="width: 100%; height: 2px; top: 0; left: 0; transform: none; border-radius: 0; opacity: 0;" />
<Handle
  type="source"
  position={Position.Bottom}
  id="bottom"
  style="width: 100%; height: 2px; bottom: 0; left: 0; top: auto; transform: none; border-radius: 0; opacity: 0;" />
<Handle
  type="source"
  position={Position.Left}
  id="left"
  style="height: 100%; width: 2px; left: 0; top: 0; transform: none; border-radius: 0; opacity: 0;" />
<Handle
  type="source"
  position={Position.Right}
  id="right"
  style="height: 100%; width: 2px; right: 0; left: auto; top: 0; transform: none; border-radius: 0; opacity: 0;" />

<div class="node-wrapper" style="--bg: {bg}; --text: {text};">
  <!-- Stick figure SVG -->
  <svg
    class="person-icon"
    viewBox="0 0 40 55"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true">
    <!-- Head -->
    <circle cx="20" cy="10" r="8" fill="currentColor" />
    <!-- Body -->
    <line
      x1="20"
      y1="18"
      x2="20"
      y2="38"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round" />
    <!-- Arms -->
    <line
      x1="6"
      y1="26"
      x2="34"
      y2="26"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round" />
    <!-- Left leg -->
    <line
      x1="20"
      y1="38"
      x2="8"
      y2="54"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round" />
    <!-- Right leg -->
    <line
      x1="20"
      y1="38"
      x2="32"
      y2="54"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round" />
  </svg>

  <div class="node-label">{c4.label}</div>
  <div class="node-type">[{typeLabel}]</div>
  {#if c4.description}
    <div class="node-description">{c4.description}</div>
  {/if}
</div>

<style>
  .node-wrapper {
    background-color: var(--bg);
    color: var(--text);
    border-radius: 8px;
    padding: 12px 16px;
    min-width: 120px;
    max-width: 200px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .person-icon {
    width: 40px;
    height: 55px;
    color: var(--text);
    flex-shrink: 0;
    margin-bottom: 4px;
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
    margin-top: 4px;
    opacity: 0.9;
    word-break: break-word;
  }
</style>
