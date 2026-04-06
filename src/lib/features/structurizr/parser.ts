/**
 * Structurizr DSL parser wrapper.
 *
 * Resolves `!include` directives from a files map, then uses the
 * `structurizr-parser` package to parse DSL into a strongly-typed
 * C4Workspace object.
 */

import { StructurizrLexer, StructurizrParser, RawInterpreter } from 'structurizr-parser';
import type {
  C4Workspace,
  C4Model,
  C4Person,
  C4SoftwareSystem,
  C4Container,
  C4Component,
  C4Relationship,
  C4DeploymentNode,
  C4ViewDefinition,
  C4ElementStyle,
  C4RelationshipStyle
} from './types.js';

// ---------------------------------------------------------------------------
// Raw interpreter output types (loose — the package doesn't export these)
// ---------------------------------------------------------------------------

interface RawRelationship {
  id?: string;
  sourceId?: string;
  destinationId?: string;
  description?: string;
  technology?: string;
  tags?: string;
}

interface RawComponent {
  id?: string;
  name?: string;
  description?: string;
  technology?: string;
  tags?: string;
  relationships?: RawRelationship[];
}

interface RawContainer {
  id?: string;
  name?: string;
  description?: string;
  technology?: string;
  tags?: string;
  components?: RawComponent[];
  relationships?: RawRelationship[];
}

interface RawPerson {
  id?: string;
  name?: string;
  description?: string;
  tags?: string;
  relationships?: RawRelationship[];
}

interface RawSoftwareSystem {
  id?: string;
  name?: string;
  description?: string;
  tags?: string;
  containers?: RawContainer[];
  relationships?: RawRelationship[];
}

interface RawDeploymentNode {
  id?: string;
  name?: string;
  description?: string;
  technology?: string;
  tags?: string;
  environment?: string;
  instances?: string;
  children?: RawDeploymentNode[];
  relationships?: RawRelationship[];
}

interface RawAutoLayout {
  rankDirection?: 'TopBottom' | 'BottomTop' | 'LeftRight' | 'RightLeft';
}

interface RawElementView {
  id?: string;
}

interface RawView {
  key?: string;
  title?: string;
  description?: string;
  automaticLayout?: RawAutoLayout;
  elements?: RawElementView[];
  softwareSystemId?: string;
  containerId?: string;
}

interface RawElementStyle {
  tag?: string;
  background?: string;
  color?: string;
  shape?: string;
  stroke?: string;
  fontSize?: number;
  opacity?: number;
}

interface RawRelationshipStyle {
  tag?: string;
  color?: string;
  thickness?: number;
  dashed?: boolean;
  fontSize?: number;
}

interface RawModel {
  people?: RawPerson[];
  softwareSystems?: RawSoftwareSystem[];
  deploymentNodes?: RawDeploymentNode[];
}

interface RawViews {
  systemLandscapeViews?: RawView[];
  systemContextViews?: RawView[];
  containerViews?: RawView[];
  componentViews?: RawView[];
  dynamicViews?: RawView[];
  deploymentViews?: RawView[];
  configuration?: {
    styles?: {
      elements?: RawElementStyle[];
      relationships?: RawRelationshipStyle[];
    };
  };
}

interface RawWorkspace {
  name?: string;
  description?: string;
  model?: RawModel;
  views?: RawViews;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

export interface ParseResult {
  workspace: C4Workspace | null;
  error: ParseError | null;
}

// ---------------------------------------------------------------------------
// Include resolution
// ---------------------------------------------------------------------------

const INCLUDE_RE = /^[ \t]*!include[ \t]+(.+)$/m;

/**
 * Recursively inline `!include <path>` directives from the files map.
 *
 * @param files     Map of filename → DSL content
 * @param entryFile The file to start resolving from
 * @param visited   Set of already-visited filenames (cycle detection)
 * @returns         The resolved DSL string with includes inlined
 */
export function resolveIncludes(
  files: Record<string, string>,
  entryFile: string,
  visited: Set<string> = new Set<string>()
): string {
  if (visited.has(entryFile)) {
    // Circular include — return empty string to break the cycle
    return '';
  }

  const content = files[entryFile];
  if (content === undefined) {
    throw new Error(`Include resolution failed: file not found in map: "${entryFile}"`);
  }

  visited.add(entryFile);

  // Replace each !include directive with the resolved content of the target file
  let resolved = content;
  let match: RegExpExecArray | null;

  // Process includes one at a time (the regex is not global, so we loop)
  while ((match = INCLUDE_RE.exec(resolved)) !== null) {
    const includedPath = match[1].trim();
    let includedContent: string;

    if (files[includedPath] !== undefined) {
      includedContent = resolveIncludes(files, includedPath, new Set(visited));
    } else {
      // File not in the map — leave a comment so the error is visible but
      // parsing can continue for the rest of the document
      includedContent = `/* !include "${includedPath}" not found in files map */`;
    }

    resolved =
      resolved.slice(0, match.index) +
      includedContent +
      resolved.slice(match.index + match[0].length);
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// Raw → C4 mapping helpers
// ---------------------------------------------------------------------------

/** Split a comma-separated tags string into an array; return [] on empty/undefined. */
function splitTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Coerce a value to a non-empty string, falling back to `fallback`. */
function str(value: unknown, fallback = ''): string {
  if (typeof value === 'string' && value.length > 0) return value;
  return fallback;
}

/** Collect all relationships from any model element that carries them. */
function collectRelationships(
  raw: { relationships?: RawRelationship[] } | undefined
): C4Relationship[] {
  if (!raw?.relationships) return [];
  return raw.relationships.map(
    (r): C4Relationship => ({
      description: str(r.description),
      sourceId: str(r.sourceId),
      tags: splitTags(r.tags),
      targetId: str(r.destinationId),
      technology: str(r.technology)
    })
  );
}

function mapComponent(raw: RawComponent): C4Component {
  return {
    description: str(raw.description),
    id: str(raw.id),
    name: str(raw.name),
    tags: splitTags(raw.tags),
    technology: str(raw.technology)
  };
}

function mapContainer(raw: RawContainer): C4Container {
  return {
    components: (raw.components ?? []).map(mapComponent),
    description: str(raw.description),
    id: str(raw.id),
    name: str(raw.name),
    tags: splitTags(raw.tags),
    technology: str(raw.technology)
  };
}

function mapPerson(raw: RawPerson): C4Person {
  return {
    description: str(raw.description),
    id: str(raw.id),
    name: str(raw.name),
    tags: splitTags(raw.tags)
  };
}

function mapSoftwareSystem(raw: RawSoftwareSystem): C4SoftwareSystem {
  return {
    containers: (raw.containers ?? []).map(mapContainer),
    description: str(raw.description),
    id: str(raw.id),
    name: str(raw.name),
    tags: splitTags(raw.tags)
  };
}

function mapDeploymentNode(raw: RawDeploymentNode): C4DeploymentNode {
  return {
    children: (raw.children ?? []).map(mapDeploymentNode),
    description: str(raw.description),
    id: str(raw.id),
    instances: raw.instances ? [raw.instances] : [],
    name: str(raw.name),
    tags: splitTags(raw.tags),
    technology: str(raw.technology)
  };
}

function extractAllRelationships(rawModel: RawModel): C4Relationship[] {
  const all: C4Relationship[] = [];

  for (const p of rawModel.people ?? []) {
    all.push(...collectRelationships(p));
  }
  for (const ss of rawModel.softwareSystems ?? []) {
    all.push(...collectRelationships(ss));
    for (const c of ss.containers ?? []) {
      all.push(...collectRelationships(c));
      for (const comp of c.components ?? []) {
        all.push(...collectRelationships(comp));
      }
    }
  }
  for (const dn of rawModel.deploymentNodes ?? []) {
    all.push(...collectRelationships(dn));
  }

  // Filter out relationships where either side has no ID (malformed entries)
  return all.filter((r) => r.sourceId && r.targetId);
}

function mapAutoLayout(raw: RawAutoLayout | undefined): C4ViewDefinition['autoLayout'] {
  if (!raw) return undefined;
  const dirMap: Record<string, 'TB' | 'BT' | 'LR' | 'RL'> = {
    TopBottom: 'TB',
    BottomTop: 'BT',
    LeftRight: 'LR',
    RightLeft: 'RL'
  };
  const direction = dirMap[raw.rankDirection ?? ''] ?? 'TB';
  return { direction };
}

function mapView(raw: RawView, type: C4ViewDefinition['type']): C4ViewDefinition {
  return {
    autoLayout: mapAutoLayout(raw.automaticLayout),
    containerId: typeof raw.containerId === 'string' ? raw.containerId : undefined,
    description: str(raw.description),
    excludes: [],
    includes: (raw.elements ?? []).map((e) => str(e.id)).filter(Boolean),
    key: str(raw.key),
    softwareSystemId: typeof raw.softwareSystemId === 'string' ? raw.softwareSystemId : undefined,
    title: str(raw.title),
    type
  };
}

function mapElementStyle(raw: RawElementStyle): C4ElementStyle {
  return {
    background: raw.background ?? undefined,
    border: raw.stroke ?? undefined,
    color: raw.color ?? undefined,
    fontSize: typeof raw.fontSize === 'number' ? raw.fontSize : undefined,
    opacity: typeof raw.opacity === 'number' ? raw.opacity : undefined,
    shape: raw.shape ?? undefined,
    tag: str(raw.tag)
  };
}

function mapRelationshipStyle(raw: RawRelationshipStyle): C4RelationshipStyle {
  return {
    color: raw.color ?? undefined,
    dashed: typeof raw.dashed === 'boolean' ? raw.dashed : undefined,
    fontSize: typeof raw.fontSize === 'number' ? raw.fontSize : undefined,
    tag: str(raw.tag),
    thickness: typeof raw.thickness === 'number' ? raw.thickness : undefined
  };
}

function mapDeploymentEnvironments(
  rawNodes: RawDeploymentNode[]
): C4Model['deploymentEnvironments'] {
  // The raw model flattens deployment nodes at the top level; group by environment.
  const envMap = new Map<string, C4DeploymentNode[]>();
  for (const dn of rawNodes) {
    const env = str(dn.environment, 'Default');
    if (!envMap.has(env)) envMap.set(env, []);
    const envNodes = envMap.get(env);
    if (envNodes) envNodes.push(mapDeploymentNode(dn));
  }
  return Array.from(envMap.entries()).map(([name, deploymentNodes]) => ({ name, deploymentNodes }));
}

/** Map raw interpreter output → C4Workspace */
function mapWorkspace(raw: RawWorkspace): C4Workspace {
  const rawModel = raw.model ?? {};
  const rawViews = raw.views ?? {};
  const rawConfig = rawViews.configuration ?? {};
  const rawStyles = rawConfig.styles ?? {};

  const model: C4Model = {
    deploymentEnvironments: mapDeploymentEnvironments(rawModel.deploymentNodes ?? []),
    people: (rawModel.people ?? []).map(mapPerson),
    relationships: extractAllRelationships(rawModel),
    softwareSystems: (rawModel.softwareSystems ?? []).map(mapSoftwareSystem)
  };

  const views: C4ViewDefinition[] = [
    ...(rawViews.systemLandscapeViews ?? []).map((v) => mapView(v, 'systemLandscape')),
    ...(rawViews.systemContextViews ?? []).map((v) => mapView(v, 'systemContext')),
    ...(rawViews.containerViews ?? []).map((v) => mapView(v, 'container')),
    ...(rawViews.componentViews ?? []).map((v) => mapView(v, 'component')),
    ...(rawViews.dynamicViews ?? []).map((v) => mapView(v, 'dynamic')),
    ...(rawViews.deploymentViews ?? []).map((v) => mapView(v, 'deployment'))
  ];

  return {
    description: str(raw.description),
    model,
    name: str(raw.name, 'Untitled Workspace'),
    views: {
      elementStyles: (rawStyles.elements ?? []).map(mapElementStyle),
      relationshipStyles: (rawStyles.relationships ?? []).map(mapRelationshipStyle),
      views
    }
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a Structurizr DSL files map into a C4Workspace.
 *
 * @param files      Map of filename → DSL content
 * @param entryFile  The entry point file (defaults to the first key in `files`)
 * @returns          ParseResult with either a workspace or a structured error
 */
export async function parseStructurizrDSL(
  files: Record<string, string>,
  entryFile?: string
): Promise<ParseResult> {
  const entry = entryFile ?? Object.keys(files)[0];
  if (!entry) {
    return {
      workspace: null,
      error: { message: 'No files provided to parse' }
    };
  }

  // Step 1: Resolve !include directives
  let dsl: string;
  try {
    dsl = resolveIncludes(files, entry);
  } catch (err) {
    return {
      workspace: null,
      error: { message: err instanceof Error ? err.message : String(err) }
    };
  }

  // Step 2: Lex
  const lexResult = StructurizrLexer.tokenize(dsl);
  if (lexResult.errors.length > 0) {
    const first = lexResult.errors[0];
    return {
      workspace: null,
      error: {
        message: `Lexer error: ${first.message}`,
        line: first.line,
        column: first.column
      }
    };
  }

  // Step 3: Parse
  StructurizrParser.input = lexResult.tokens;
  const cst = StructurizrParser.workspaceWrapper();

  if (StructurizrParser.errors.length > 0) {
    const first = StructurizrParser.errors[0];
    const token = first.token;
    return {
      workspace: null,
      error: {
        message: `Parse error: ${first.message}`,
        line: token?.startLine ?? undefined,
        column: token?.startColumn ?? undefined
      }
    };
  }

  // Step 4: Interpret CST → raw workspace JSON
  let raw: RawWorkspace;
  try {
    raw = RawInterpreter.visit(cst) as RawWorkspace;
  } catch (err) {
    return {
      workspace: null,
      error: {
        message: `Interpreter error: ${err instanceof Error ? err.message : String(err)}`
      }
    };
  }

  // Step 5: Map raw → strongly-typed C4Workspace
  try {
    const workspace = mapWorkspace(raw);
    return { workspace, error: null };
  } catch (err) {
    return {
      workspace: null,
      error: {
        message: `Mapping error: ${err instanceof Error ? err.message : String(err)}`
      }
    };
  }
}
