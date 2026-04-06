<script lang="ts">
  /**
   * Custom edge that renders ELK's exact orthogonal bend points.
   * This produces truly non-overlapping paths since ELK computed
   * each route to avoid other edges and nodes.
   */
  import { type EdgeProps } from '@xyflow/svelte';

  let { id, sourceX, sourceY, targetX, targetY, data, markerEnd, style }: EdgeProps = $props();

  const bendPoints = $derived(
    ((data as Record<string, unknown>)?.bendPoints as { x: number; y: number }[]) ?? []
  );

  // Build the SVG path from source → bend points → target
  const path = $derived(() => {
    let d = `M ${sourceX} ${sourceY}`;
    for (const bp of bendPoints) {
      d += ` L ${bp.x} ${bp.y}`;
    }
    d += ` L ${targetX} ${targetY}`;
    return d;
  });
</script>

<g class="elk-edge-group">
  <path
    {id}
    d={path()}
    fill="none"
    stroke="#94a3b8"
    stroke-width="1"
    marker-end={markerEnd}
    {style}
    class="elk-edge-path" />
  <!-- Wider invisible hit area for hover -->
  <path d={path()} fill="none" stroke="transparent" stroke-width="12" class="elk-edge-hit" />
</g>

<style>
  .elk-edge-path {
    transition:
      stroke-width 150ms ease,
      stroke 150ms ease;
  }
  .elk-edge-group:hover .elk-edge-path {
    stroke-width: 2.5px;
    stroke: #3b82f6;
  }
</style>
