/**
 * ELK-based layout for C4 diagrams.
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
    layerSpacing = 200,
    nodeSpacing = 120
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
      'elk.layered.spacing.edgeEdgeBetweenLayers': '60',
      'elk.layered.spacing.edgeNodeBetweenLayers': '80',
      'elk.layered.spacing.nodeNodeBetweenLayers': String(layerSpacing),
      'elk.portConstraints': 'FREE',
      'elk.spacing.edgeEdge': '50',
      'elk.spacing.edgeNode': '60',
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

  // Position nodes
  const elkNodeMap = new Map<string, { height: number; width: number; x: number; y: number }>();
  for (const child of layoutResult.children ?? []) {
    elkNodeMap.set(child.id, {
      height: child.height ?? nodeHeight,
      width: child.width ?? nodeWidth,
      x: child.x ?? 0,
      y: child.y ?? 0
    });
  }

  const layoutedNodes = nodes.map((node) => {
    if (positionOverrides[node.id]) {
      return { ...node, position: positionOverrides[node.id] };
    }
    const pos = elkNodeMap.get(node.id);
    if (!pos) return node;
    return { ...node, position: { x: pos.x, y: pos.y } };
  });

  // Process edges - determine handles from ELK's edge sections
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

  const layoutedEdges = edges.map((edge) => {
    const elkEdge = elkEdgeMap.get(edge.id);
    const section = elkEdge?.sections?.[0];

    const srcNode = elkNodeMap.get(edge.source);
    const tgtNode = elkNodeMap.get(edge.target);

    let sourceHandle = 'bottom';
    let targetHandle = 'top';

    if (section?.startPoint && srcNode) {
      sourceHandle = getHandleFromPort(section.startPoint, srcNode);
    }
    if (section?.endPoint && tgtNode) {
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

  return { nodes: layoutedNodes, edges: layoutedEdges };
}

/** Determine which side of a node a port point is on. */
function getHandleFromPort(
  point: { x: number; y: number },
  node: { height: number; width: number; x: number; y: number }
): string {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const dx = point.x - cx;
  const dy = point.y - cy;

  // Normalize by node dimensions to handle non-square nodes
  const normalizedDx = dx / (node.width / 2);
  const normalizedDy = dy / (node.height / 2);

  if (Math.abs(normalizedDx) > Math.abs(normalizedDy)) {
    return normalizedDx > 0 ? 'right' : 'left';
  }
  return normalizedDy > 0 ? 'bottom' : 'top';
}

export const applyDagreLayout = applyElkLayout;
