<script lang="ts">
  import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/svelte';

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

  const pathResult = $derived(
    getSmoothStepPath({
      borderRadius: 8,
      offset,
      sourcePosition,
      sourceX,
      sourceY,
      targetPosition,
      targetX,
      targetY
    })
  );
</script>

<BaseEdge {id} path={pathResult[0]} {markerEnd} {style} />
