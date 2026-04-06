/**
 * ELK-based layout for C4 diagrams with per-edge handle positioning.
 *
 * ELK computes exact port positions for each edge endpoint. We convert those
 * into unique handles positioned at precise points along each node's border,
 * so no two edges share the same connection point.
 */

import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/svelte';
import { MarkerType } from '@xyflow/svelte';

const elk = new ELK();

export interface LayoutOptions {
  direction?: 'DOWN' | 'UP' | 'RIGHT' | 'LEFT';
  nodeWidth?: number;
  nodeHeight?: number;
  layerSpacing?: number;
  nodeSpacing?: number;
}

/** Handle definition: a unique connection point on a node's border. */
export interface HandleDef {
  id: string;
  side: 'top' | 'bottom' | 'left' | 'right';
  /** Position along the side as a percentage (0–100). */
  percent: number;
}

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
    layerSpacing = 250,
    nodeSpacing = 150
  } = options;

  if (nodes.length === 0) return { nodes: [], edges: [] };

  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.spacing.edgeEdgeBetweenLayers': '80',
      'elk.layered.spacing.edgeNodeBetweenLayers': '100',
      'elk.layered.spacing.nodeNodeBetweenLayers': String(layerSpacing),
      'elk.portConstraints': 'FREE',
      'elk.spacing.edgeEdge': '80',
      'elk.spacing.edgeNode': '80',
      'elk.spacing.nodeNode': String(nodeSpacing)
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: nodeWidth,
      height: nodeHeight
    })),
    edges: edges
      .filter((e) => nodes.some((n) => n.id === e.source) && nodes.some((n) => n.id === e.target))
      .map((e) => ({
        id: e.id,
        sources: [e.source],
        targets: [e.target]
      }))
  };

  const layoutResult = await elk.layout(elkGraph);

  // --- Build node position map ---
  const elkNodeMap = new Map<string, { height: number; width: number; x: number; y: number }>();
  for (const child of layoutResult.children ?? []) {
    elkNodeMap.set(child.id, {
      height: child.height ?? nodeHeight,
      width: child.width ?? nodeWidth,
      x: child.x ?? 0,
      y: child.y ?? 0
    });
  }

  // --- Collect per-edge handle definitions ---
  // For each edge, compute the exact handle position on source and target nodes.
  // handleDefsPerNode: nodeId → HandleDef[]
  const handleDefsPerNode = new Map<string, HandleDef[]>();

  function ensureHandleList(nodeId: string): HandleDef[] {
    let list = handleDefsPerNode.get(nodeId);
    if (!list) {
      list = [];
      handleDefsPerNode.set(nodeId, list);
    }
    return list;
  }

  const elkEdgeMap = new Map<
    string,
    {
      sections?: {
        bendPoints?: { x: number; y: number }[];
        endPoint?: { x: number; y: number };
        startPoint?: { x: number; y: number };
      }[];
    }
  >();
  for (const elkEdge of layoutResult.edges ?? []) {
    elkEdgeMap.set(elkEdge.id, elkEdge);
  }

  // First pass: compute handle positions for each edge
  interface EdgeHandleInfo {
    bendPoints: { x: number; y: number }[];
    sourceHandleId: string;
    targetHandleId: string;
  }
  const edgeHandleInfoMap = new Map<string, EdgeHandleInfo>();

  for (const edge of edges) {
    const elkEdge = elkEdgeMap.get(edge.id);
    const section = elkEdge?.sections?.[0];
    const srcNode = elkNodeMap.get(edge.source);
    const tgtNode = elkNodeMap.get(edge.target);

    if (!section?.startPoint || !section?.endPoint || !srcNode || !tgtNode) {
      edgeHandleInfoMap.set(edge.id, {
        bendPoints: [],
        sourceHandleId: 'bottom',
        targetHandleId: 'top'
      });
      continue;
    }

    // Compute source handle
    const srcHandle = computeHandleDef(`src-${edge.id}`, section.startPoint, srcNode);
    ensureHandleList(edge.source).push(srcHandle);

    // Compute target handle
    const tgtHandle = computeHandleDef(`tgt-${edge.id}`, section.endPoint, tgtNode);
    ensureHandleList(edge.target).push(tgtHandle);

    edgeHandleInfoMap.set(edge.id, {
      bendPoints: section.bendPoints ?? [],
      sourceHandleId: srcHandle.id,
      targetHandleId: tgtHandle.id
    });
  }

  // --- Position nodes and attach handle definitions ---
  const layoutedNodes = nodes.map((node) => {
    const pos =
      positionOverrides[node.id] ??
      (() => {
        const p = elkNodeMap.get(node.id);
        return p ? { x: p.x, y: p.y } : node.position;
      })();

    const handles = handleDefsPerNode.get(node.id) ?? [];

    return {
      ...node,
      data: {
        ...(node.data as Record<string, unknown>),
        handles
      },
      position: pos
    };
  });

  // --- Build edges with unique handle IDs ---
  // Group edges by source node to stagger bend offsets for parallel edges
  const sourceEdgeCount = new Map<string, number>();

  const layoutedEdges = edges.map((edge) => {
    const info = edgeHandleInfoMap.get(edge.id) ?? {
      bendPoints: [],
      sourceHandleId: 'bottom',
      targetHandleId: 'top'
    };

    // Stagger: count how many edges already left this source node
    const idx = sourceEdgeCount.get(edge.source) ?? 0;
    sourceEdgeCount.set(edge.source, idx + 1);

    // Offset the smoothstep bend point so parallel edges don't overlap
    // Each subsequent edge bends 20px further from the midpoint
    const offset = idx * 20;

    return {
      ...edge,
      data: {
        ...((edge.data as Record<string, unknown>) ?? {}),
        pathOptions: { offset }
      },
      markerEnd: { height: 15, type: MarkerType.ArrowClosed, width: 15 },
      pathOptions: { offset },
      sourceHandle: info.sourceHandleId,
      targetHandle: info.targetHandleId,
      type: 'smoothstep'
    };
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
}

/**
 * Convert an absolute ELK port point into a HandleDef with side and percentage.
 */
function computeHandleDef(
  id: string,
  point: { x: number; y: number },
  node: { height: number; width: number; x: number; y: number }
): HandleDef {
  // Compute position relative to the node's top-left corner
  const relX = point.x - node.x;
  const relY = point.y - node.y;

  // Determine which side the point is on based on proximity to each edge
  const distTop = relY;
  const distBottom = node.height - relY;
  const distLeft = relX;
  const distRight = node.width - relX;

  const minDist = Math.min(distTop, distBottom, distLeft, distRight);

  if (minDist === distTop) {
    return { id, percent: clampPercent((relX / node.width) * 100), side: 'top' };
  }
  if (minDist === distBottom) {
    return { id, percent: clampPercent((relX / node.width) * 100), side: 'bottom' };
  }
  if (minDist === distLeft) {
    return { id, percent: clampPercent((relY / node.height) * 100), side: 'left' };
  }
  return { id, percent: clampPercent((relY / node.height) * 100), side: 'right' };
}

function clampPercent(v: number): number {
  return Math.max(5, Math.min(95, v));
}

export const applyDagreLayout = applyElkLayout;
