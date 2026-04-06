<script lang="ts">
  import { BaseEdge, type EdgeProps } from '@xyflow/svelte';

  let { id, sourceX, sourceY, targetX, targetY, data, label, markerEnd, style }: EdgeProps =
    $props();

  // Use the ELK-computed path if available, otherwise fall back to a straight line
  const elkPath = $derived((data as Record<string, unknown>)?.elkPath as string | undefined);

  const path = $derived(elkPath ? elkPath : `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`);

  // Compute label position at the midpoint of the path
  const labelX = $derived(elkPath ? getLabelX(elkPath) : (sourceX + targetX) / 2);
  const labelY = $derived(elkPath ? getLabelY(elkPath) : (sourceY + targetY) / 2);

  function getLabelX(d: string): number {
    const points = parsePathPoints(d);
    if (points.length === 0) return 0;
    const mid = Math.floor(points.length / 2);
    return points[mid].x;
  }

  function getLabelY(d: string): number {
    const points = parsePathPoints(d);
    if (points.length === 0) return 0;
    const mid = Math.floor(points.length / 2);
    return points[mid].y;
  }

  function parsePathPoints(d: string): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const re = /[ML]\s*([\d.e+-]+)\s+([\d.e+-]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(d)) !== null) {
      points.push({ x: parseFloat(m[1]), y: parseFloat(m[2]) });
    }
    return points;
  }
</script>

<BaseEdge {id} {path} {markerEnd} {style} />

{#if label}
  <foreignObject
    x={labelX - 75}
    y={labelY - 10}
    width="150"
    height="20"
    class="elk-edge-label"
    requiredExtensions="http://www.w3.org/1999/xhtml">
    <div class="label-text">
      {label}
    </div>
  </foreignObject>
{/if}

<style>
  .elk-edge-label {
    overflow: visible;
    pointer-events: none;
  }
  .label-text {
    font-size: 10px;
    color: var(--muted-foreground, #888);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    background: var(--background, #fff);
    padding: 1px 4px;
    border-radius: 3px;
    line-height: 1.3;
    width: fit-content;
    max-width: 150px;
    margin: 0 auto;
  }
</style>
