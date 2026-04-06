/**
 * Applies Dagre graph layout to SvelteFlow nodes and edges.
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
  /** Vertical separation between ranks. Default: 80 */
  rankSep?: number;
  /** Horizontal separation between nodes in the same rank. Default: 60 */
  nodeSep?: number;
}

/**
 * Applies Dagre auto-layout to a set of SvelteFlow nodes and edges.
 *
 * @param nodes - SvelteFlow nodes (positions will be overwritten by Dagre, or by positionOverrides).
 * @param edges - SvelteFlow edges (used to determine graph connectivity).
 * @param options - Optional layout configuration.
 * @param positionOverrides - Map of node ID → {x, y}. When provided, these positions
 *   take precedence over Dagre's calculated positions (e.g. for preserved manual drags).
 * @returns A new array of nodes with updated `position` values.
 */
export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: DagreLayoutOptions = {},
  positionOverrides: Record<string, { x: number; y: number }> = {}
): Node[] {
  const {
    direction = 'TB',
    nodeWidth = 280,
    nodeHeight = 160,
    rankSep = 80,
    nodeSep = 60
  } = options;

  const graph = new dagre.graphlib.Graph();

  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: direction,
    ranksep: rankSep,
    nodesep: nodeSep
  });

  for (const node of nodes) {
    graph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  }

  for (const edge of edges) {
    // Only add the edge if both endpoints are present as nodes
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(graph);

  const layoutedNodes = nodes.map((node) => {
    // positionOverrides take precedence over Dagre
    if (positionOverrides[node.id]) {
      return { ...node, position: positionOverrides[node.id] };
    }

    const dagreNode = graph.node(node.id);
    if (!dagreNode) {
      return node;
    }

    // Dagre centers nodes; convert to top-left origin for SvelteFlow
    return {
      ...node,
      position: {
        x: dagreNode.x - nodeWidth / 2,
        y: dagreNode.y - nodeHeight / 2
      }
    };
  });

  // Build a position lookup for computing optimal handle pairs
  const posMap = new Map<string, { cx: number; cy: number }>();
  for (const node of layoutedNodes) {
    posMap.set(node.id, {
      cx: node.position.x + nodeWidth / 2,
      cy: node.position.y + nodeHeight / 2
    });
  }

  // Assign sourceHandle/targetHandle on edges based on relative node positions
  const layoutedEdges = edges.map((edge) => {
    const src = posMap.get(edge.source);
    const tgt = posMap.get(edge.target);
    if (!src || !tgt) return edge;

    const dx = tgt.cx - src.cx;
    const dy = tgt.cy - src.cy;

    let sourceHandle: string;
    let targetHandle: string;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal relationship
      sourceHandle = dx > 0 ? 'right' : 'left';
      targetHandle = dx > 0 ? 'left' : 'right';
    } else {
      // Vertical relationship
      sourceHandle = dy > 0 ? 'bottom' : 'top';
      targetHandle = dy > 0 ? 'top' : 'bottom';
    }

    return { ...edge, sourceHandle, targetHandle };
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
}
