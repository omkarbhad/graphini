/**
 * ELK-based layout for C4 diagrams.
 *
 * Uses the Eclipse Layout Kernel (elkjs) with its `layered` algorithm and
 * ORTHOGONAL edge routing. ELK computes both node positions and edge bend
 * points that guarantee:
 *   - No edge-edge crossings (crossing minimisation)
 *   - No edge-node overlaps (orthogonal routing avoids nodes)
 *   - Edges connect at distributed ports along node borders
 */

import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/svelte';

const elk = new ELK();

export interface LayoutOptions {
  /** Graph direction. Default: 'DOWN' */
  direction?: 'DOWN' | 'UP' | 'RIGHT' | 'LEFT';
  /** Node width for layout. Default: 280 */
  nodeWidth?: number;
  /** Node height for layout. Default: 160 */
  nodeHeight?: number;
  /** Spacing between layers/ranks. Default: 80 */
  layerSpacing?: number;
  /** Spacing between nodes in the same layer. Default: 60 */
  nodeSpacing?: number;
}

/** Map from C4 autoLayout directions to ELK directions. */
const DIRECTION_MAP: Record<string, string> = {
  BT: 'UP',
  DOWN: 'DOWN',
  LEFT: 'LEFT',
  LR: 'RIGHT',
  RIGHT: 'RIGHT',
  RL: 'LEFT',
  TB: 'DOWN',
  UP: 'UP'
};

export function normalizeDirection(dir?: string): string {
  if (!dir) return 'DOWN';
  return DIRECTION_MAP[dir.toUpperCase()] ?? 'DOWN';
}

/**
 * Apply ELK layout to SvelteFlow nodes and edges.
 *
 * Returns positioned nodes and edges with bend-point paths that avoid
 * all crossings and node overlaps.
 */
export async function applyElkLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {},
  positionOverrides: Record<string, { x: number; y: number }> = {}
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const {
    direction = 'DOWN',
    nodeWidth = 280,
    nodeHeight = 180,
    layerSpacing = 150,
    nodeSpacing = 100
  } = options;

  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  // Build the ELK graph
  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      // Orthogonal edge routing — edges bend at right angles and avoid nodes
      'elk.edgeRouting': 'ORTHOGONAL',
      // Crossing minimisation
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      // Node placement to reduce edge length
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      // Spacing
      'elk.layered.spacing.baseValue': String(nodeSpacing),
      'elk.layered.spacing.edgeEdgeBetweenLayers': '50',
      'elk.layered.spacing.edgeNodeBetweenLayers': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': String(layerSpacing),
      // Distribute ports along node edges (not just center)
      'elk.portConstraints': 'FREE',
      // Edge spacing — generous to prevent label overlap
      'elk.spacing.edgeEdge': '40',
      // Label spacing
      'elk.spacing.edgeLabel': '15',
      'elk.spacing.edgeNode': '50',
      'elk.spacing.nodeNode': String(nodeSpacing)
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: nodeWidth,
      height: nodeHeight
    })),
    edges: edges
      .filter((e) => {
        const hasSource = nodes.some((n) => n.id === e.source);
        const hasTarget = nodes.some((n) => n.id === e.target);
        return hasSource && hasTarget;
      })
      .map((e) => ({
        id: e.id,
        sources: [e.source],
        targets: [e.target]
      }))
  };

  const layoutResult = await elk.layout(elkGraph);

  // --- Map ELK results back to SvelteFlow ---

  const elkNodeMap = new Map<string, { x: number; y: number }>();
  for (const child of layoutResult.children ?? []) {
    elkNodeMap.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
  }

  const layoutedNodes = nodes.map((node) => {
    if (positionOverrides[node.id]) {
      return { ...node, position: positionOverrides[node.id] };
    }
    const pos = elkNodeMap.get(node.id);
    if (!pos) return node;
    return { ...node, position: { x: pos.x, y: pos.y } };
  });

  // Build edge lookup from ELK result
  const elkEdgeMap = new Map<
    string,
    {
      sections?: {
        bendPoints?: { x: number; y: number }[];
        startPoint?: { x: number; y: number };
        endPoint?: { x: number; y: number };
      }[];
    }
  >();
  for (const elkEdge of layoutResult.edges ?? []) {
    elkEdgeMap.set(elkEdge.id, elkEdge);
  }

  // Convert ELK bend points to SVG path for each edge
  const layoutedEdges = edges.map((edge) => {
    const elkEdge = elkEdgeMap.get(edge.id);
    const section = elkEdge?.sections?.[0];

    if (!section?.startPoint || !section?.endPoint) {
      // Fallback: no routing data, use smoothstep
      return { ...edge, type: 'smoothstep' };
    }

    const start = section.startPoint;
    const end = section.endPoint;
    const bends = section.bendPoints ?? [];

    // Build SVG path: M start L bend1 L bend2 ... L end
    let d = `M ${start.x} ${start.y}`;
    for (const bp of bends) {
      d += ` L ${bp.x} ${bp.y}`;
    }
    d += ` L ${end.x} ${end.y}`;

    // Compute source/target handles based on edge direction at endpoints
    const sourceHandle = getHandleFromDirection(start, bends[0] ?? end);
    const targetHandle = getHandleFromDirection(end, bends[bends.length - 1] ?? start);

    return {
      ...edge,
      data: { ...((edge.data as Record<string, unknown>) ?? {}), elkPath: d },
      sourceHandle,
      targetHandle,
      type: 'smoothstep'
    };
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
}

/** Determine which handle (top/bottom/left/right) an edge enters/exits from. */
function getHandleFromDirection(
  point: { x: number; y: number },
  otherPoint: { x: number; y: number }
): string {
  const dx = otherPoint.x - point.x;
  const dy = otherPoint.y - point.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'bottom' : 'top';
}

// Keep the old function name as an alias for backwards compatibility
export const applyDagreLayout = applyElkLayout;
