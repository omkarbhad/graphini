<script lang="ts">
  /**
   * Custom edge that renders ELK's exact orthogonal bend points,
   * transformed into SvelteFlow's coordinate space.
   *
   * The key insight: ELK computes startPoint/endPoint/bendPoints in absolute
   * graph coordinates. SvelteFlow passes us sourceX/sourceY and targetX/targetY
   * which are the handle positions in the same coordinate system BUT may differ
   * slightly from ELK's start/end because of handle positioning rounding.
   *
   * We compute the delta between SvelteFlow's source/target and ELK's start/end,
   * then interpolate bend points accordingly.
   */
  import { BaseEdge, type EdgeProps } from '@xyflow/svelte';

  let { id, sourceX, sourceY, targetX, targetY, data, markerEnd, style }: EdgeProps = $props();

  const edgeData = $derived(data as Record<string, unknown>);
  const bendPoints = $derived((edgeData?.bendPoints as { x: number; y: number }[]) ?? []);
  const elkStart = $derived(
    (edgeData?.elkStart as { x: number; y: number }) ?? { x: sourceX, y: sourceY }
  );
  const elkEnd = $derived(
    (edgeData?.elkEnd as { x: number; y: number }) ?? { x: targetX, y: targetY }
  );

  const path = $derived(
    computePath(sourceX, sourceY, targetX, targetY, elkStart, elkEnd, bendPoints)
  );

  function computePath(
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    eStart: { x: number; y: number },
    eEnd: { x: number; y: number },
    bends: { x: number; y: number }[]
  ): string {
    if (bends.length === 0) {
      // No bends — straight line
      return `M ${sx} ${sy} L ${tx} ${ty}`;
    }

    // Transform ELK absolute coordinates → SvelteFlow coordinates.
    // ELK's start maps to SvelteFlow's source, ELK's end maps to target.
    // Bend points are interpolated between these two reference frames.
    const dxStart = sx - eStart.x;
    const dyStart = sy - eStart.y;
    const dxEnd = tx - eEnd.x;
    const dyEnd = ty - eEnd.y;

    // For each bend point, interpolate the transform based on how far along
    // the path it is (0 = at source, 1 = at target)
    const totalElkDist = Math.abs(eEnd.y - eStart.y) + Math.abs(eEnd.x - eStart.x);

    const transformed = bends.map((bp) => {
      // Estimate progress along path (0→1)
      const bpDist = Math.abs(bp.y - eStart.y) + Math.abs(bp.x - eStart.x);
      const t = totalElkDist > 0 ? Math.min(1, bpDist / totalElkDist) : 0.5;

      // Lerp between source delta and target delta
      return {
        x: bp.x + dxStart * (1 - t) + dxEnd * t,
        y: bp.y + dyStart * (1 - t) + dyEnd * t
      };
    });

    // Build path with rounded corners
    let d = `M ${sx} ${sy}`;

    for (let i = 0; i < transformed.length; i++) {
      const bp = transformed[i];
      const prev = i === 0 ? { x: sx, y: sy } : transformed[i - 1];
      const next = i < transformed.length - 1 ? transformed[i + 1] : { x: tx, y: ty };

      // Round the corner at this bend point
      const r = 6;
      const fromDx = Math.sign(bp.x - prev.x);
      const fromDy = Math.sign(bp.y - prev.y);
      const toDx = Math.sign(next.x - bp.x);
      const toDy = Math.sign(next.y - bp.y);

      const segIn = Math.sqrt((bp.x - prev.x) ** 2 + (bp.y - prev.y) ** 2);
      const segOut = Math.sqrt((next.x - bp.x) ** 2 + (next.y - bp.y) ** 2);
      const maxR = Math.min(r, segIn / 2, segOut / 2);

      if (maxR < 1) {
        d += ` L ${bp.x} ${bp.y}`;
      } else {
        const ax = bp.x - fromDx * maxR;
        const ay = bp.y - fromDy * maxR;
        const bx = bp.x + toDx * maxR;
        const by = bp.y + toDy * maxR;
        d += ` L ${ax} ${ay} Q ${bp.x} ${bp.y} ${bx} ${by}`;
      }
    }

    d += ` L ${tx} ${ty}`;
    return d;
  }
</script>

<BaseEdge {id} {path} {markerEnd} {style} />
