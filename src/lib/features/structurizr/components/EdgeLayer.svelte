<script lang="ts">
  /**
   * Custom edge rendering layer that draws ELK-computed orthogonal paths
   * directly as SVG inside SvelteFlow's viewport.
   *
   * This bypasses SvelteFlow's edge system entirely — no handles, no edge
   * types, no coordinate transforms. The paths use ELK's absolute coordinates
   * which match SvelteFlow's node positions exactly.
   */

  import type { ElkRoute } from '../layout.js';

  interface Props {
    routes: ElkRoute[];
  }

  let { routes }: Props = $props();

  function buildPath(points: { x: number; y: number }[]): string {
    if (points.length < 2) return '';

    const r = 8; // corner radius
    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      // Direction vectors
      const fromDx = Math.sign(curr.x - prev.x);
      const fromDy = Math.sign(curr.y - prev.y);
      const toDx = Math.sign(next.x - curr.x);
      const toDy = Math.sign(next.y - curr.y);

      // Only round if there's an actual turn
      if (fromDx === toDx && fromDy === toDy) {
        d += ` L ${curr.x} ${curr.y}`;
        continue;
      }

      const segIn = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2);
      const segOut = Math.sqrt((next.x - curr.x) ** 2 + (next.y - curr.y) ** 2);
      const maxR = Math.min(r, segIn / 2, segOut / 2);

      if (maxR < 1) {
        d += ` L ${curr.x} ${curr.y}`;
      } else {
        const ax = curr.x - fromDx * maxR;
        const ay = curr.y - fromDy * maxR;
        const bx = curr.x + toDx * maxR;
        const by = curr.y + toDy * maxR;
        d += ` L ${ax} ${ay} Q ${curr.x} ${curr.y} ${bx} ${by}`;
      }
    }

    // Final point
    const last = points[points.length - 1];
    d += ` L ${last.x} ${last.y}`;
    return d;
  }
</script>

<svg
  class="elk-edge-layer"
  style="position: absolute; top: 0; left: 0; width: 0; height: 0; pointer-events: none; overflow: visible; z-index: -1;">
  <defs>
    <marker
      id="elk-arrowhead"
      viewBox="0 0 10 10"
      refX="10"
      refY="5"
      markerWidth="8"
      markerHeight="8"
      orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 Z" fill="#94a3b8" />
    </marker>
  </defs>

  {#each routes as route (route.id)}
    {@const d = buildPath(route.points)}
    {#if d}
      <!-- Invisible hit area for hover -->
      <path
        {d}
        fill="none"
        stroke="transparent"
        stroke-width="14"
        style="pointer-events: stroke; cursor: pointer;"
        class="elk-edge-hit" />
      <!-- Visible path -->
      <path
        {d}
        fill="none"
        stroke="#94a3b8"
        stroke-width="1.2"
        marker-end="url(#elk-arrowhead)"
        class="elk-edge-path" />
    {/if}
  {/each}
</svg>

<style>
  .elk-edge-path {
    transition:
      stroke-width 150ms ease,
      stroke 150ms ease;
  }
  .elk-edge-hit:hover + .elk-edge-path {
    stroke-width: 2.5px;
    stroke: #3b82f6;
  }
</style>
