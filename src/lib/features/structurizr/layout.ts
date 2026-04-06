/**
 * ELK-based layout for C4 diagrams.
 *
 * ELK computes node positions. For edges, we determine which of the 4 sides
 * (top/bottom/left/right) each endpoint should use based on ELK's section
 * start/end points, then use smoothstep edges with arrow markers.
 */

import ELK from 'elkjs/lib/elk.bundled.js';
import { MarkerType, type Edge, type Node } from '@xyflow/svelte';

const elk = new ELK();

export interface LayoutOptions {
  direction?: 'DOWN' | 'UP' | 'RIGHT' | 'LEFT';
  layerSpacing?: number;
  nodeHeight?: number;
  nodeSpacing?: number;
  nodeWidth?: number;
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

/**
 * Determine which side (top/bottom/left/right) a point is on relative to a node.
 */
function getHandleFromPort(
  point: { x: number; y: number },
  node: { height: number; width: number; x: number; y: number }
): string {
  const relX = point.x - node.x;
  const relY = point.y - node.y;

  const distBottom = node.height - relY;
  const distLeft = relX;
  const distRight = node.width - relX;
  const distTop = relY;

  const minDist = Math.min(distTop, distBottom, distLeft, distRight);

  if (minDist === distTop) return 'top';
  if (minDist === distBottom) return 'bottom';
  if (minDist === distLeft) return 'left';
  return 'right';
}

export async function applyElkLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {},
  positionOverrides: Record<string, { x: number; y: number }> = {}
): Promise<{ edges: Edge[]; nodes: Node[] }> {
  const {
    direction = 'DOWN',
    layerSpacing = 250,
    nodeHeight = 180,
    nodeSpacing = 150,
    nodeWidth = 280
  } = options;

  if (nodes.length === 0) return { edges: [], nodes: [] };

  const elkGraph = {
    children: nodes.map((node) => ({
      height: nodeHeight,
      id: node.id,
      width: nodeWidth
    })),
    edges: edges
      .filter((e) => nodes.some((n) => n.id === e.source) && nodes.some((n) => n.id === e.target))
      .map((e) => ({
        id: e.id,
        sources: [e.source],
        targets: [e.target]
      })),
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
    }
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

  // --- Build ELK edge map for handle determination ---
  const elkEdgeMap = new Map<
    string,
    {
      sections?: {
        endPoint?: { x: number; y: number };
        startPoint?: { x: number; y: number };
      }[];
    }
  >();
  for (const elkEdge of layoutResult.edges ?? []) {
    elkEdgeMap.set(elkEdge.id, elkEdge);
  }

  // --- Position nodes ---
  const layoutedNodes = nodes.map((node) => {
    const pos =
      positionOverrides[node.id] ??
      (() => {
        const p = elkNodeMap.get(node.id);
        return p ? { x: p.x, y: p.y } : node.position;
      })();

    return {
      ...node,
      position: pos
    };
  });

  // --- Build edges with handle sides and smoothstep type ---
  const layoutedEdges = edges.map((edge) => {
    const elkEdge = elkEdgeMap.get(edge.id);
    const section = elkEdge?.sections?.[0];
    const srcNode = elkNodeMap.get(edge.source);
    const tgtNode = elkNodeMap.get(edge.target);

    let sourceHandle = 'bottom';
    let targetHandle = 'top';

    if (section?.startPoint && section?.endPoint && srcNode && tgtNode) {
      sourceHandle = getHandleFromPort(section.startPoint, srcNode);
      targetHandle = getHandleFromPort(section.endPoint, tgtNode);
    }

    return {
      ...edge,
      markerEnd: { height: 15, type: MarkerType.ArrowClosed, width: 15 },
      sourceHandle,
      targetHandle,
      type: 'smoothstep'
    };
  });

  return { edges: layoutedEdges, nodes: layoutedNodes };
}

export const applyDagreLayout = applyElkLayout;
