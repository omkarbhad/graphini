/**
 * Transforms a C4Workspace + selected view key into SvelteFlow nodes and edges.
 */

import type { Node, Edge } from '@xyflow/svelte';
import type {
  C4Workspace,
  C4ViewDefinition,
  C4NodeType,
  C4Person,
  C4SoftwareSystem,
  C4Container,
  C4Component,
  C4Relationship
} from './types.js';
import { C4_COLORS, C4_TEXT_COLORS } from './types.js';

export interface ViewSummary {
  key: string;
  title: string;
  type: C4ViewDefinition['type'];
}

export interface TransformResult {
  nodes: Node[];
  edges: Edge[];
  viewTitle: string;
}

interface NodeData {
  label: string;
  description: string;
  technology?: string;
  background: string;
  color: string;
  c4Type: C4NodeType;
  [key: string]: unknown;
}

/** Returns the list of all views available in the workspace. */
export function getAvailableViews(workspace: C4Workspace): ViewSummary[] {
  return workspace.views.views.map((v) => ({
    key: v.key,
    title: v.title || v.key,
    type: v.type
  }));
}

/** Looks up the style overrides for a given set of tags from workspace element styles. */
function resolveStyles(
  tags: string[],
  workspace: C4Workspace,
  defaultBackground: string,
  defaultColor: string
): { background: string; color: string } {
  let background = defaultBackground;
  let color = defaultColor;

  for (const style of workspace.views.elementStyles) {
    if (tags.includes(style.tag)) {
      if (style.background) background = style.background;
      if (style.color) color = style.color;
    }
  }

  return { background, color };
}

/** Builds a SvelteFlow node for a person. */
function personNode(person: C4Person, workspace: C4Workspace): Node<NodeData> {
  const { background, color } = resolveStyles(
    person.tags,
    workspace,
    C4_COLORS.person,
    C4_TEXT_COLORS.person
  );
  return {
    id: person.id,
    type: 'person',
    position: { x: 0, y: 0 },
    data: {
      background,
      c4Type: 'person',
      color,
      description: person.description,
      label: person.name
    }
  };
}

/** Builds a SvelteFlow node for a software system. */
function softwareSystemNode(system: C4SoftwareSystem, workspace: C4Workspace): Node<NodeData> {
  const { background, color } = resolveStyles(
    system.tags,
    workspace,
    C4_COLORS.softwareSystem,
    C4_TEXT_COLORS.softwareSystem
  );
  return {
    id: system.id,
    type: 'softwareSystem',
    position: { x: 0, y: 0 },
    data: {
      background,
      c4Type: 'softwareSystem',
      color,
      description: system.description,
      label: system.name
    }
  };
}

/** Builds a SvelteFlow node for a container. */
function containerNode(
  container: C4Container,
  workspace: C4Workspace,
  systemId: string
): Node<NodeData> {
  const { background, color } = resolveStyles(
    container.tags,
    workspace,
    C4_COLORS.container,
    C4_TEXT_COLORS.container
  );
  return {
    id: container.id,
    type: 'container',
    position: { x: 0, y: 0 },
    data: {
      background,
      c4Type: 'container',
      color,
      description: container.description,
      label: container.name,
      parentSystemId: systemId,
      technology: container.technology
    }
  };
}

/** Builds a SvelteFlow node for a component. */
function componentNode(component: C4Component, workspace: C4Workspace): Node<NodeData> {
  const { background, color } = resolveStyles(
    component.tags,
    workspace,
    C4_COLORS.component,
    C4_TEXT_COLORS.component
  );
  return {
    id: component.id,
    type: 'component',
    position: { x: 0, y: 0 },
    data: {
      background,
      c4Type: 'component',
      color,
      description: component.description,
      label: component.name,
      technology: component.technology
    }
  };
}

/** Builds SvelteFlow edges from relationships, filtered to visible element IDs. */
function buildEdges(
  relationships: C4Relationship[],
  visibleIds: Set<string>,
  workspace: C4Workspace
): Edge[] {
  return relationships
    .filter((r) => visibleIds.has(r.sourceId) && visibleIds.has(r.targetId))
    .map((r, index) => {
      // Resolve relationship style
      let edgeColor: string | undefined;
      let dashed: boolean | undefined;
      for (const style of workspace.views.relationshipStyles) {
        if (r.tags.includes(style.tag)) {
          if (style.color) edgeColor = style.color;
          if (style.dashed !== undefined) dashed = style.dashed;
        }
      }

      const edgeId = `${r.sourceId}-${r.targetId}-${index}`;
      return {
        data: {
          color: edgeColor,
          dashed,
          technology: r.technology
        },
        id: edgeId,
        label: r.description || undefined,
        source: r.sourceId,
        target: r.targetId
      } as Edge;
    });
}

/**
 * Determines whether the view should include all relevant elements.
 * A view with `includes: ['*']` or an empty includes list defaults to showing all.
 */
function isIncludeAll(view: C4ViewDefinition): boolean {
  return view.includes.length === 0 || view.includes.some((inc) => inc.trim() === '*');
}

/** Transforms a System Landscape view: shows all people + all software systems. */
function transformSystemLandscape(workspace: C4Workspace, view: C4ViewDefinition): TransformResult {
  const nodes: Node<NodeData>[] = [];
  const includeAll = isIncludeAll(view);

  const explicitIds = new Set(view.includes.filter((id) => id !== '*'));
  const excludeIds = new Set(view.excludes);

  for (const person of workspace.model.people) {
    if (excludeIds.has(person.id)) continue;
    if (includeAll || explicitIds.has(person.id)) {
      nodes.push(personNode(person, workspace));
    }
  }

  for (const system of workspace.model.softwareSystems) {
    if (excludeIds.has(system.id)) continue;
    if (includeAll || explicitIds.has(system.id)) {
      nodes.push(softwareSystemNode(system, workspace));
    }
  }

  const visibleIds = new Set(nodes.map((n) => n.id));
  const edges = buildEdges(workspace.model.relationships, visibleIds, workspace);

  return { nodes, edges, viewTitle: view.title || view.key };
}

/** Transforms a System Context view: shows the target system + people + external software systems. */
function transformSystemContext(workspace: C4Workspace, view: C4ViewDefinition): TransformResult {
  if (!view.softwareSystemId) {
    return transformSystemLandscape(workspace, view);
  }

  const nodes: Node<NodeData>[] = [];
  const includeAll = isIncludeAll(view);
  const explicitIds = new Set(view.includes.filter((id) => id !== '*'));
  const excludeIds = new Set(view.excludes);

  // Always include the focal system
  const focalSystem = workspace.model.softwareSystems.find((s) => s.id === view.softwareSystemId);
  if (focalSystem && !excludeIds.has(focalSystem.id)) {
    nodes.push(softwareSystemNode(focalSystem, workspace));
  }

  for (const person of workspace.model.people) {
    if (excludeIds.has(person.id)) continue;
    if (includeAll || explicitIds.has(person.id)) {
      nodes.push(personNode(person, workspace));
    }
  }

  for (const system of workspace.model.softwareSystems) {
    if (system.id === view.softwareSystemId) continue; // already added
    if (excludeIds.has(system.id)) continue;
    if (includeAll || explicitIds.has(system.id)) {
      nodes.push(softwareSystemNode(system, workspace));
    }
  }

  const visibleIds = new Set(nodes.map((n) => n.id));
  const edges = buildEdges(workspace.model.relationships, visibleIds, workspace);

  return { nodes, edges, viewTitle: view.title || view.key };
}

/** Transforms a Container view: shows containers of target system + people + external systems. */
function transformContainer(workspace: C4Workspace, view: C4ViewDefinition): TransformResult {
  if (!view.softwareSystemId) {
    return transformSystemLandscape(workspace, view);
  }

  const nodes: Node<NodeData>[] = [];
  const includeAll = isIncludeAll(view);
  const explicitIds = new Set(view.includes.filter((id) => id !== '*'));
  const excludeIds = new Set(view.excludes);

  const targetSystem = workspace.model.softwareSystems.find((s) => s.id === view.softwareSystemId);

  // Add containers of the target system
  if (targetSystem) {
    for (const container of targetSystem.containers) {
      if (excludeIds.has(container.id)) continue;
      if (includeAll || explicitIds.has(container.id)) {
        nodes.push(containerNode(container, workspace, targetSystem.id));
      }
    }
  }

  // Add people that interact (include all or explicitly listed)
  for (const person of workspace.model.people) {
    if (excludeIds.has(person.id)) continue;
    if (includeAll || explicitIds.has(person.id)) {
      nodes.push(personNode(person, workspace));
    }
  }

  // Add external software systems (not the focal one)
  for (const system of workspace.model.softwareSystems) {
    if (system.id === view.softwareSystemId) continue;
    if (excludeIds.has(system.id)) continue;
    if (includeAll || explicitIds.has(system.id)) {
      nodes.push(softwareSystemNode(system, workspace));
    }
  }

  const visibleIds = new Set(nodes.map((n) => n.id));
  const edges = buildEdges(workspace.model.relationships, visibleIds, workspace);

  return { nodes, edges, viewTitle: view.title || view.key };
}

/** Transforms a Component view: shows components of target container + external containers. */
function transformComponent(workspace: C4Workspace, view: C4ViewDefinition): TransformResult {
  if (!view.containerId) {
    return transformSystemLandscape(workspace, view);
  }

  const nodes: Node<NodeData>[] = [];
  const includeAll = isIncludeAll(view);
  const explicitIds = new Set(view.includes.filter((id) => id !== '*'));
  const excludeIds = new Set(view.excludes);

  // Find the target container across all software systems
  let targetContainer: C4Container | undefined;
  for (const system of workspace.model.softwareSystems) {
    const found = system.containers.find((c) => c.id === view.containerId);
    if (found) {
      targetContainer = found;
      break;
    }
  }

  // Add components of the target container
  if (targetContainer) {
    for (const component of targetContainer.components) {
      if (excludeIds.has(component.id)) continue;
      if (includeAll || explicitIds.has(component.id)) {
        nodes.push(componentNode(component, workspace));
      }
    }
  }

  // Add people
  for (const person of workspace.model.people) {
    if (excludeIds.has(person.id)) continue;
    if (includeAll || explicitIds.has(person.id)) {
      nodes.push(personNode(person, workspace));
    }
  }

  // Add external containers (from other systems or the same system but not the focal container)
  for (const system of workspace.model.softwareSystems) {
    for (const container of system.containers) {
      if (container.id === view.containerId) continue;
      if (excludeIds.has(container.id)) continue;
      if (includeAll || explicitIds.has(container.id)) {
        nodes.push(containerNode(container, workspace, system.id));
      }
    }
  }

  const visibleIds = new Set(nodes.map((n) => n.id));
  const edges = buildEdges(workspace.model.relationships, visibleIds, workspace);

  return { nodes, edges, viewTitle: view.title || view.key };
}

/**
 * Transforms a C4Workspace and a view key into SvelteFlow nodes, edges, and the view title.
 * Positions are set to {x:0, y:0} — use `applyDagreLayout` to compute actual positions.
 */
export function transformToSvelteFlow(workspace: C4Workspace, viewKey: string): TransformResult {
  const view = workspace.views.views.find((v) => v.key === viewKey);

  if (!view) {
    return { nodes: [], edges: [], viewTitle: viewKey };
  }

  switch (view.type) {
    case 'systemLandscape':
      return transformSystemLandscape(workspace, view);
    case 'systemContext':
      return transformSystemContext(workspace, view);
    case 'container':
      return transformContainer(workspace, view);
    case 'component':
      return transformComponent(workspace, view);
    default:
      // For dynamic, deployment, and any future types, fall back to landscape logic
      return transformSystemLandscape(workspace, view);
  }
}
