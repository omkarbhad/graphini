<script lang="ts">
  /**
   * Custom edge that creates orthogonal (right-angle) paths with staggered
   * bend corridors. Each edge gets a unique offset so parallel edges don't
   * share the same bend line.
   */
  import { BaseEdge, type EdgeProps, Position } from '@xyflow/svelte';

  let {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
    style
  }: EdgeProps = $props();

  const offset = $derived(((data as Record<string, unknown>)?.offset as number) ?? 0);

  /**
   * Build an orthogonal path with staggered bend points.
   * For vertical flow (top→bottom): the horizontal corridor shifts by offset.
   * For horizontal flow (left→right): the vertical corridor shifts by offset.
   */
  const path = $derived(
    buildPath(sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, offset)
  );

  function buildPath(
    sx: number,
    sy: number,
    sPos: Position,
    tx: number,
    ty: number,
    tPos: Position,
    off: number
  ): string {
    const isVertical =
      (sPos === Position.Bottom && tPos === Position.Top) ||
      (sPos === Position.Top && tPos === Position.Bottom);

    const isHorizontal =
      (sPos === Position.Right && tPos === Position.Left) ||
      (sPos === Position.Left && tPos === Position.Right);

    const r = 6; // corner radius

    if (isVertical) {
      // Bend corridor: halfway between source and target Y, shifted by offset
      const midY = (sy + ty) / 2 + off;

      if (Math.abs(sx - tx) < 1) {
        // Straight vertical line
        return `M ${sx} ${sy} L ${tx} ${ty}`;
      }

      // S→down→horizontal→down→T with rounded corners
      return roundedOrthogonal(sx, sy, sx, midY, tx, midY, tx, ty, r);
    }

    if (isHorizontal) {
      const midX = (sx + tx) / 2 + off;

      if (Math.abs(sy - ty) < 1) {
        return `M ${sx} ${sy} L ${tx} ${ty}`;
      }

      return roundedOrthogonal(sx, sy, midX, sy, midX, ty, tx, ty, r);
    }

    // Mixed directions (e.g., bottom→left): use two-segment path
    if (
      (sPos === Position.Bottom || sPos === Position.Top) &&
      (tPos === Position.Left || tPos === Position.Right)
    ) {
      // Go vertical first, then horizontal
      const cornerY = ty;
      return `M ${sx} ${sy} L ${sx} ${cornerY + off} L ${tx} ${cornerY + off} L ${tx} ${ty}`;
    }

    if (
      (sPos === Position.Left || sPos === Position.Right) &&
      (tPos === Position.Top || tPos === Position.Bottom)
    ) {
      const cornerX = tx;
      return `M ${sx} ${sy} L ${cornerX + off} ${sy} L ${cornerX + off} ${ty} L ${tx} ${ty}`;
    }

    // Fallback: straight line
    return `M ${sx} ${sy} L ${tx} ${ty}`;
  }

  /**
   * Build an orthogonal path through 4 points with rounded corners.
   * Points: (x1,y1) → (x2,y2) → (x3,y3) → (x4,y4)
   * where (x2,y2)→(x3,y3) is the corridor segment.
   */
  function roundedOrthogonal(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
    r: number
  ): string {
    // Clamp radius to not exceed segment lengths
    const seg1 = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const seg2 = Math.sqrt((x3 - x2) ** 2 + (y3 - y2) ** 2);
    const seg3 = Math.sqrt((x4 - x3) ** 2 + (y4 - y3) ** 2);
    const maxR = Math.min(r, seg1 / 2, seg2 / 2, seg3 / 2);

    if (maxR < 1) {
      return `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4}`;
    }

    // Direction vectors for corners
    const d1x = Math.sign(x2 - x1);
    const d1y = Math.sign(y2 - y1);
    const d2x = Math.sign(x3 - x2);
    const d2y = Math.sign(y3 - y2);
    const d3x = Math.sign(x4 - x3);
    const d3y = Math.sign(y4 - y3);

    // Corner 1: at (x2, y2)
    const c1ax = x2 - d1x * maxR;
    const c1ay = y2 - d1y * maxR;
    const c1bx = x2 + d2x * maxR;
    const c1by = y2 + d2y * maxR;

    // Corner 2: at (x3, y3)
    const c2ax = x3 - d2x * maxR;
    const c2ay = y3 - d2y * maxR;
    const c2bx = x3 + d3x * maxR;
    const c2by = y3 + d3y * maxR;

    return `M ${x1} ${y1} L ${c1ax} ${c1ay} Q ${x2} ${y2} ${c1bx} ${c1by} L ${c2ax} ${c2ay} Q ${x3} ${y3} ${c2bx} ${c2by} L ${x4} ${y4}`;
  }
</script>

<BaseEdge {id} {path} {markerEnd} {style} />
