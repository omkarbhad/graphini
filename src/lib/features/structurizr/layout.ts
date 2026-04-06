/**
 * Applies Dagre graph layout to SvelteFlow nodes and edges.
 *
 * Uses Dagre for node positioning (which already minimises edge crossings)
 * and `smoothstep` edges for orthogonal routing with right-angle bends.
 */

import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/svelte';

export interface DagreLayoutOptions {
  /** Graph direction. Default: 'TB' */
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  /** Node width used for layout calculation. Default: 280 */
  nodeWidth?: number;
  /** Node height used for layout calculation. Default: 160 */
  nodeHeight?: number;
  /** Vertical separation between ranks. Default: 140 */
  rankSep?: number;
  /** Horizontal separation between nodes in the same rank. Default: 100 */
  nodeSep?: number;
  /** Horizontal separation between edges in the same rank. Default: 40 */
  edgeSep?: number;
}

/**
 * Applies Dagre auto-layout to a set of SvelteFlow nodes and edges.
 *
 * Returns both positioned nodes and edges with handle + type assignments.
 */
export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: DagreLayoutOptions = {},
  positionOverrides: Record<string, { x: number; y: number }> = {}
): { nodes: Node[]; edges: Edge[] } {
  const {
    direction = 'TB',
    nodeWidth = 280,
    nodeHeight = 160,
    rankSep = 140,
    nodeSep = 100,
    edgeSep = 40
  } = options;

  const isHorizontal = direction === 'LR' || direction === 'RL';

  const graph = new dagre.graphlib.Graph();

  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    edgesep: edgeSep,
    nodesep: nodeSep,
    rankdir: direction,
    ranksep: rankSep
  });

  for (const node of nodes) {
    graph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  }

  for (const edge of edges) {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(graph);

  // --- Position nodes ---

  const layoutedNodes = nodes.map((node) => {
    if (positionOverrides[node.id]) {
      return { ...node, position: positionOverrides[node.id] };
    }

    const dagreNode = graph.node(node.id);
    if (!dagreNode) return node;

    return {
      ...node,
      position: {
        x: dagreNode.x - nodeWidth / 2,
        y: dagreNode.y - nodeHeight / 2
      }
    };
  });

  // --- Build position lookup (centre of each node) ---

  const posMap = new Map<string, { cx: number; cy: number }>();
  for (const node of layoutedNodes) {
    posMap.set(node.id, {
      cx: node.position.x + nodeWidth / 2,
      cy: node.position.y + nodeHeight / 2
    });
  }

  // --- Assign handles, edge type, and stagger offsets to avoid overlap ---

  // Group edges by their (sourceHandle, targetHandle) pair so we can offset
  // parallel edges that share the same axis.
  const handlePairCount = new Map<string, number>();

  const layoutedEdges = edges.map((edge) => {
    const src = posMap.get(edge.source);
    const tgt = posMap.get(edge.target);
    if (!src || !tgt) return { ...edge, type: 'smoothstep' };

    const dx = tgt.cx - src.cx;
    const dy = tgt.cy - src.cy;

    let sourceHandle: string;
    let targetHandle: string;

    if (isHorizontal) {
      // For LR/RL layouts, prefer left/right handles
      if (Math.abs(dx) >= Math.abs(dy) * 0.3) {
        sourceHandle = dx > 0 ? 'right' : 'left';
        targetHandle = dx > 0 ? 'left' : 'right';
      } else {
        sourceHandle = dy > 0 ? 'bottom' : 'top';
        targetHandle = dy > 0 ? 'top' : 'bottom';
      }
    } else {
      // For TB/BT layouts, prefer top/bottom handles
      if (Math.abs(dy) >= Math.abs(dx) * 0.3) {
        sourceHandle = dy > 0 ? 'bottom' : 'top';
        targetHandle = dy > 0 ? 'top' : 'bottom';
      } else {
        sourceHandle = dx > 0 ? 'right' : 'left';
        targetHandle = dx > 0 ? 'left' : 'right';
      }
    }

    // Track how many edges share the same handle pair for offset staggering
    const pairKey = `${edge.source}:${sourceHandle}`;
    const idx = handlePairCount.get(pairKey) ?? 0;
    handlePairCount.set(pairKey, idx + 1);

    return {
      ...edge,
      sourceHandle,
      // Stagger parallel edges slightly so they don't stack on top of each other
      style: idx > 0 ? `stroke-dashoffset: ${idx * 4}px;` : undefined,
      targetHandle,
      // smoothstep creates orthogonal right-angle bends that route cleanly
      type: 'smoothstep'
    };
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
}
