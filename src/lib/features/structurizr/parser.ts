/**
 * Custom lightweight Structurizr DSL parser.
 *
 * Replaces the broken `structurizr-parser` package with a line-by-line
 * brace-tracking parser that handles the core DSL features we need.
 */

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
// Include resolution (unchanged)
// ---------------------------------------------------------------------------

const INCLUDE_RE = /^[ \t]*!include[ \t]+(.+)$/m;

/**
 * Recursively inline `!include <path>` directives from the files map.
 */
export function resolveIncludes(
  files: Record<string, string>,
  entryFile: string,
  visited: Set<string> = new Set<string>()
): string {
  if (visited.has(entryFile)) {
    return '';
  }

  const content = files[entryFile];
  if (content === undefined) {
    throw new Error(`Include resolution failed: file not found in map: "${entryFile}"`);
  }

  visited.add(entryFile);

  let resolved = content;
  let match: RegExpExecArray | null;

  while ((match = INCLUDE_RE.exec(resolved)) !== null) {
    const includedPath = match[1].trim();
    let includedContent: string;

    if (files[includedPath] !== undefined) {
      includedContent = resolveIncludes(files, includedPath, new Set(visited));
    } else {
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
// Helpers
// ---------------------------------------------------------------------------

/** Extract all quoted strings from a line. */
function extractQuoted(line: string): string[] {
  const results: string[] = [];
  const re = /"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    results.push(m[1]);
  }
  return results;
}

/** Split comma-separated tags into an array. */
function splitTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Strip comments from DSL source. Handles // and block comments. */
function stripComments(src: string): string {
  // Remove block comments first
  let result = src.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    // Preserve line count so line numbers stay correct
    return match.replace(/[^\n]/g, '');
  });
  // Remove line comments
  result = result.replace(/\/\/.*$/gm, '');
  return result;
}

// ---------------------------------------------------------------------------
// Tokeniser: split into lines, track brace depth, build block tree
// ---------------------------------------------------------------------------

interface Block {
  keyword: string; // first word of the opening line
  fullLine: string; // the full opening line (trimmed)
  lineNumber: number;
  children: Block[];
  bodyLines: { text: string; lineNumber: number }[];
}

function buildBlockTree(lines: string[]): Block {
  const root: Block = {
    bodyLines: [],
    children: [],
    fullLine: '',
    keyword: '__root__',
    lineNumber: 0
  };

  const stack: Block[] = [root];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const lineNum = i + 1;

    // Count braces on this line
    const openCount = (trimmed.match(/\{/g) || []).length;
    const closeCount = (trimmed.match(/\}/g) || []).length;

    if (openCount > 0) {
      // This line opens a new block
      const lineBefore = trimmed.replace(/\{[^}]*$/, '').trim();
      const firstWord = lineBefore.split(/\s+/)[0]?.toLowerCase() || '';

      const newBlock: Block = {
        bodyLines: [],
        children: [],
        fullLine: lineBefore,
        keyword: firstWord,
        lineNumber: lineNum
      };

      const parent = stack[stack.length - 1];
      parent.children.push(newBlock);
      stack.push(newBlock);
      depth += openCount;

      // Handle case where open and close are on the same line: `autoLayout lr`
      // won't happen with braces, but `{ }` on one line could
      for (let c = 0; c < closeCount; c++) {
        if (stack.length > 1) stack.pop();
      }
    } else if (closeCount > 0) {
      for (let c = 0; c < closeCount; c++) {
        if (stack.length > 1) stack.pop();
      }
    } else {
      // A body line — belongs to the current block
      const parent = stack[stack.length - 1];
      parent.bodyLines.push({ text: trimmed, lineNumber: lineNum });
    }
  }

  return root;
}

// ---------------------------------------------------------------------------
// Element parsers
// ---------------------------------------------------------------------------

// Match: varName = person "Name" "Desc" "Tags"
// Match: varName = softwareSystem "Name" "Desc" "Tags"
// Match: varName = container "Name" "Desc" "Tech" "Tags"
// Match: varName = component "Name" "Desc" "Tech" "Tags"
const ELEMENT_RE = /^(\w+)\s*=\s*(person|softwareSystem|softwaresystem|container|component)\b/i;

// Match: source -> destination "desc" "tech"
const RELATIONSHIP_RE = /^(\w+)\s*->\s*(\w+)/;

// Match: containerInstance varName
const CONTAINER_INSTANCE_RE = /^containerInstance\s+(\w+)/i;

interface ParserContext {
  variables: Map<string, string>; // varName -> element id (same as varName)
  relationships: C4Relationship[];
  errors: ParseError[];
}

function parseElementLine(line: string): { varName: string; type: string; args: string[] } | null {
  const m = ELEMENT_RE.exec(line);
  if (!m) return null;
  return {
    varName: m[1],
    type: m[2].toLowerCase() === 'softwaresystem' ? 'softwareSystem' : m[2].toLowerCase(),
    args: extractQuoted(line)
  };
}

function parsePerson(block: Block, ctx: ParserContext): C4Person | null {
  const parsed = parseElementLine(block.fullLine);
  if (!parsed || parsed.type !== 'person') return null;

  const [name, desc, tags] = parsed.args;
  ctx.variables.set(parsed.varName, parsed.varName);

  // Also parse body lines for relationships
  parseBodyRelationships(block, ctx);

  return {
    id: parsed.varName,
    name: name || parsed.varName,
    description: desc || '',
    tags: splitTags(tags)
  };
}

function parseComponent(block: Block, ctx: ParserContext): C4Component | null {
  const parsed = parseElementLine(block.fullLine);
  if (!parsed || parsed.type !== 'component') return null;

  const [name, desc, tech, tags] = parsed.args;
  ctx.variables.set(parsed.varName, parsed.varName);

  parseBodyRelationships(block, ctx);

  return {
    description: desc || '',
    id: parsed.varName,
    name: name || parsed.varName,
    tags: splitTags(tags),
    technology: tech || ''
  };
}

function parseContainer(block: Block, ctx: ParserContext): C4Container | null {
  const parsed = parseElementLine(block.fullLine);
  if (!parsed || parsed.type !== 'container') return null;

  const [name, desc, tech, tags] = parsed.args;
  ctx.variables.set(parsed.varName, parsed.varName);

  const components: C4Component[] = [];

  // Parse child blocks (components)
  for (const child of block.children) {
    const childParsed = parseElementLine(child.fullLine);
    if (childParsed?.type === 'component') {
      const comp = parseComponent(child, ctx);
      if (comp) components.push(comp);
    } else {
      // Could be a group block
      if (child.keyword === 'group') {
        for (const gc of child.children) {
          const gcParsed = parseElementLine(gc.fullLine);
          if (gcParsed?.type === 'component') {
            const comp = parseComponent(gc, ctx);
            if (comp) components.push(comp);
          }
        }
        parseBodyRelationships(child, ctx);
      }
    }
  }

  // Parse body-line components (no braces)
  for (const bodyLine of block.bodyLines) {
    const bp = parseElementLine(bodyLine.text);
    if (bp?.type === 'component') {
      const [cName, cDesc, cTech, cTags] = bp.args;
      ctx.variables.set(bp.varName, bp.varName);
      components.push({
        description: cDesc || '',
        id: bp.varName,
        name: cName || bp.varName,
        tags: splitTags(cTags),
        technology: cTech || ''
      });
    }
  }

  parseBodyRelationships(block, ctx);

  return {
    components,
    description: desc || '',
    id: parsed.varName,
    name: name || parsed.varName,
    tags: splitTags(tags),
    technology: tech || ''
  };
}

function parseSoftwareSystem(block: Block, ctx: ParserContext): C4SoftwareSystem | null {
  const parsed = parseElementLine(block.fullLine);
  if (!parsed || parsed.type !== 'softwareSystem') return null;

  const [name, desc, tags] = parsed.args;
  ctx.variables.set(parsed.varName, parsed.varName);

  const containers: C4Container[] = [];

  for (const child of block.children) {
    const childParsed = parseElementLine(child.fullLine);
    if (childParsed?.type === 'container') {
      const cont = parseContainer(child, ctx);
      if (cont) containers.push(cont);
    } else if (child.keyword === 'group') {
      for (const gc of child.children) {
        const gcParsed = parseElementLine(gc.fullLine);
        if (gcParsed?.type === 'container') {
          const cont = parseContainer(gc, ctx);
          if (cont) containers.push(cont);
        }
      }
      parseBodyRelationships(child, ctx);
    }
  }

  // Parse body-line containers (no braces)
  for (const bodyLine of block.bodyLines) {
    const bp = parseElementLine(bodyLine.text);
    if (bp?.type === 'container') {
      const [cName, cDesc, cTech, cTags] = bp.args;
      ctx.variables.set(bp.varName, bp.varName);
      containers.push({
        components: [],
        description: cDesc || '',
        id: bp.varName,
        name: cName || bp.varName,
        tags: splitTags(cTags),
        technology: cTech || ''
      });
    }
  }

  parseBodyRelationships(block, ctx);

  return {
    containers,
    description: desc || '',
    id: parsed.varName,
    name: name || parsed.varName,
    tags: splitTags(tags)
  };
}

function parseBodyRelationships(block: Block, ctx: ParserContext): void {
  for (const bodyLine of block.bodyLines) {
    const rm = RELATIONSHIP_RE.exec(bodyLine.text);
    if (rm) {
      const quoted = extractQuoted(bodyLine.text);
      ctx.relationships.push({
        description: quoted[0] || '',
        sourceId: rm[1],
        tags: splitTags(quoted[2]),
        targetId: rm[2],
        technology: quoted[1] || ''
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Deployment parsing
// ---------------------------------------------------------------------------

function parseDeploymentNode(block: Block, ctx: ParserContext): C4DeploymentNode {
  const args = extractQuoted(block.fullLine);
  // deploymentNode "Name" "Desc" "Tech" "Tags"
  const firstWord = block.fullLine.split(/\s+/)[0] || '';
  // Could be varName = deploymentNode ... or just deploymentNode ...
  let id: string;
  const assignMatch = /^(\w+)\s*=\s*deploymentNode/i.exec(block.fullLine);
  if (assignMatch) {
    id = assignMatch[1];
    ctx.variables.set(id, id);
  } else {
    id = (args[0] || firstWord).replace(/\s+/g, '_').toLowerCase();
  }

  const [name, desc, tech, tags] = args;

  const children: C4DeploymentNode[] = [];
  const instances: string[] = [];

  for (const child of block.children) {
    if (
      child.keyword === 'deploymentnode' ||
      (child.keyword.match(/^\w+$/) && child.fullLine.match(/deploymentNode/i))
    ) {
      children.push(parseDeploymentNode(child, ctx));
    }
  }

  // Check body lines for containerInstance
  for (const bodyLine of block.bodyLines) {
    const ciMatch = CONTAINER_INSTANCE_RE.exec(bodyLine.text);
    if (ciMatch) {
      instances.push(ciMatch[1]);
    }
  }

  // Also check child blocks for containerInstance (when it has no braces it's a body line,
  // but some might write it as a block)
  for (const child of block.children) {
    if (child.keyword === 'containerinstance') {
      const ciMatch = CONTAINER_INSTANCE_RE.exec(child.fullLine);
      if (ciMatch) instances.push(ciMatch[1]);
    }
  }

  return {
    children,
    description: desc || '',
    id,
    instances,
    name: name || id,
    tags: splitTags(tags),
    technology: tech || ''
  };
}

function parseDeploymentEnvironment(
  block: Block,
  ctx: ParserContext
): { name: string; deploymentNodes: C4DeploymentNode[] } {
  const args = extractQuoted(block.fullLine);
  const name = args[0] || 'Default';

  const deploymentNodes: C4DeploymentNode[] = [];
  for (const child of block.children) {
    const lowerLine = child.fullLine.toLowerCase();
    if (lowerLine.includes('deploymentnode') || child.keyword === 'deploymentnode') {
      deploymentNodes.push(parseDeploymentNode(child, ctx));
    } else if (/^\w+\s*=\s*deploymentNode/i.test(child.fullLine)) {
      deploymentNodes.push(parseDeploymentNode(child, ctx));
    }
  }

  return { name, deploymentNodes };
}

// ---------------------------------------------------------------------------
// Model parsing
// ---------------------------------------------------------------------------

function parseModelBlock(block: Block, ctx: ParserContext): C4Model {
  const people: C4Person[] = [];
  const softwareSystems: C4SoftwareSystem[] = [];
  const deploymentEnvironments: C4Model['deploymentEnvironments'] = [];

  for (const child of block.children) {
    const parsed = parseElementLine(child.fullLine);
    if (parsed) {
      switch (parsed.type) {
        case 'person': {
          const p = parsePerson(child, ctx);
          if (p) people.push(p);
          break;
        }
        case 'softwareSystem': {
          const ss = parseSoftwareSystem(child, ctx);
          if (ss) softwareSystems.push(ss);
          break;
        }
        // container/component at model level (unusual but possible)
        default:
          break;
      }
    } else if (
      child.keyword === 'deploymentenvironment' ||
      child.fullLine.toLowerCase().startsWith('deploymentenvironment')
    ) {
      deploymentEnvironments.push(parseDeploymentEnvironment(child, ctx));
    } else if (child.keyword === 'group') {
      // Group at model level: parse children as model elements
      for (const gc of child.children) {
        const gcParsed = parseElementLine(gc.fullLine);
        if (gcParsed) {
          switch (gcParsed.type) {
            case 'person': {
              const p = parsePerson(gc, ctx);
              if (p) people.push(p);
              break;
            }
            case 'softwareSystem': {
              const ss = parseSoftwareSystem(gc, ctx);
              if (ss) softwareSystems.push(ss);
              break;
            }
          }
        }
      }
      parseBodyRelationships(child, ctx);
    }
  }

  // Parse relationships in model body lines
  parseBodyRelationships(block, ctx);

  return {
    people,
    softwareSystems,
    relationships: ctx.relationships,
    deploymentEnvironments
  };
}

// ---------------------------------------------------------------------------
// View parsing
// ---------------------------------------------------------------------------

const VIEW_TYPE_RE = /^(systemLandscape|systemContext|container|component|dynamic|deployment)\b/i;

function parseViewBlock(block: Block): C4ViewDefinition | null {
  const line = block.fullLine;
  const vtMatch = VIEW_TYPE_RE.exec(line);
  if (!vtMatch) return null;

  const rawType = vtMatch[1].toLowerCase();
  let type: C4ViewDefinition['type'];
  switch (rawType) {
    case 'systemlandscape':
      type = 'systemLandscape';
      break;
    case 'systemcontext':
      type = 'systemContext';
      break;
    case 'container':
      type = 'container';
      break;
    case 'component':
      type = 'component';
      break;
    case 'dynamic':
      type = 'dynamic';
      break;
    case 'deployment':
      type = 'deployment';
      break;
    default:
      return null;
  }

  // Extract the rest after the view type keyword
  const rest = line.slice(vtMatch[0].length).trim();

  // Parse: varName "ViewKey" or varName "EnvironmentName" "ViewKey" etc.
  // First token is the variable reference (e.g., softwareSystem var)
  const tokens = rest.split(/\s+/);
  const quoted = extractQuoted(line);

  let softwareSystemId: string | undefined;
  let containerId: string | undefined;
  let key = '';

  if (type === 'deployment') {
    // deployment varName "EnvName" "ViewKey"
    const varRef = tokens[0] && !tokens[0].startsWith('"') ? tokens[0] : undefined;
    softwareSystemId = varRef;
    // key is the last quoted string, env name is first
    key = quoted.length >= 2 ? quoted[quoted.length - 1] : quoted[0] || '';
  } else if (type === 'systemLandscape') {
    // systemLandscape "ViewKey"
    key = quoted[0] || '';
  } else {
    // systemContext/container/component varName "ViewKey"
    const varRef = tokens[0] && !tokens[0].startsWith('"') ? tokens[0] : undefined;
    if (type === 'systemContext' || type === 'container') {
      softwareSystemId = varRef;
    }
    if (type === 'component') {
      containerId = varRef;
    }
    key = quoted[quoted.length - 1] || '';
  }

  // Parse body lines for includes, excludes, autoLayout, title, description
  const includes: string[] = [];
  const excludes: string[] = [];
  let autoLayout: C4ViewDefinition['autoLayout'] | undefined;
  let title = '';
  let description: string | undefined;

  for (const bodyLine of block.bodyLines) {
    const text = bodyLine.text;

    if (/^include\s+/i.test(text)) {
      const includeRest = text.replace(/^include\s+/i, '').trim();
      if (includeRest === '*') {
        includes.push('*');
      } else {
        includes.push(...includeRest.split(/\s+/));
      }
    } else if (/^exclude\s+/i.test(text)) {
      const excludeRest = text.replace(/^exclude\s+/i, '').trim();
      excludes.push(...excludeRest.split(/\s+/));
    } else if (/^autoLayout/i.test(text)) {
      const dirMatch = /^autoLayout\s+(lr|rl|tb|bt)/i.exec(text);
      const direction = dirMatch ? (dirMatch[1].toUpperCase() as 'TB' | 'BT' | 'LR' | 'RL') : 'TB';
      autoLayout = { direction };
    } else if (/^title\s+/i.test(text)) {
      const tq = extractQuoted(text);
      title = tq[0] || text.replace(/^title\s+/i, '').trim();
    } else if (/^description\s+/i.test(text)) {
      const dq = extractQuoted(text);
      description = dq[0] || text.replace(/^description\s+/i, '').trim();
    }
  }

  return {
    autoLayout,
    containerId,
    description,
    excludes,
    includes,
    key,
    softwareSystemId,
    title,
    type
  };
}

// ---------------------------------------------------------------------------
// Style parsing
// ---------------------------------------------------------------------------

function parseElementStyleBlock(block: Block): C4ElementStyle {
  const args = extractQuoted(block.fullLine);
  const tag = args[0] || '';

  const style: C4ElementStyle = { tag };

  for (const bodyLine of block.bodyLines) {
    const text = bodyLine.text;
    const parts = text.split(/\s+/);
    const prop = parts[0]?.toLowerCase();
    const value = parts.slice(1).join(' ');

    switch (prop) {
      case 'shape':
        style.shape = value;
        break;
      case 'background':
        style.background = value;
        break;
      case 'color':
      case 'colour':
        style.color = value;
        break;
      case 'border':
        style.border = value;
        break;
      case 'fontsize':
        style.fontSize = parseInt(value, 10) || undefined;
        break;
      case 'opacity':
        style.opacity = parseInt(value, 10) || undefined;
        break;
    }
  }

  return style;
}

function parseRelationshipStyleBlock(block: Block): C4RelationshipStyle {
  const args = extractQuoted(block.fullLine);
  const tag = args[0] || '';

  const style: C4RelationshipStyle = { tag };

  for (const bodyLine of block.bodyLines) {
    const text = bodyLine.text;
    const parts = text.split(/\s+/);
    const prop = parts[0]?.toLowerCase();
    const value = parts.slice(1).join(' ');

    switch (prop) {
      case 'color':
      case 'colour':
        style.color = value;
        break;
      case 'thickness':
        style.thickness = parseInt(value, 10) || undefined;
        break;
      case 'dashed':
        style.dashed = value.toLowerCase() === 'true';
        break;
      case 'fontsize':
        style.fontSize = parseInt(value, 10) || undefined;
        break;
    }
  }

  return style;
}

function parseStylesBlock(block: Block): {
  elementStyles: C4ElementStyle[];
  relationshipStyles: C4RelationshipStyle[];
} {
  const elementStyles: C4ElementStyle[] = [];
  const relationshipStyles: C4RelationshipStyle[] = [];

  for (const child of block.children) {
    if (child.keyword === 'element') {
      elementStyles.push(parseElementStyleBlock(child));
    } else if (child.keyword === 'relationship') {
      relationshipStyles.push(parseRelationshipStyleBlock(child));
    }
  }

  return { elementStyles, relationshipStyles };
}

// ---------------------------------------------------------------------------
// Views block parsing
// ---------------------------------------------------------------------------

function parseViewsBlock(block: Block): {
  views: C4ViewDefinition[];
  elementStyles: C4ElementStyle[];
  relationshipStyles: C4RelationshipStyle[];
} {
  const views: C4ViewDefinition[] = [];
  let elementStyles: C4ElementStyle[] = [];
  let relationshipStyles: C4RelationshipStyle[] = [];

  for (const child of block.children) {
    if (child.keyword === 'styles') {
      const styles = parseStylesBlock(child);
      elementStyles = styles.elementStyles;
      relationshipStyles = styles.relationshipStyles;
    } else {
      const view = parseViewBlock(child);
      if (view) views.push(view);
    }
  }

  return { views, elementStyles, relationshipStyles };
}

// ---------------------------------------------------------------------------
// Main workspace parsing
// ---------------------------------------------------------------------------

function parseWorkspaceBlock(root: Block): C4Workspace {
  // Find the workspace block (should be a child of root)
  const wsBlock = root.children.find((b) => b.keyword === 'workspace') || root;

  const args = extractQuoted(wsBlock.fullLine);
  const name = args[0] || 'Untitled Workspace';
  const description = args[1] || '';

  let model: C4Model = {
    people: [],
    softwareSystems: [],
    relationships: [],
    deploymentEnvironments: []
  };

  let views: C4ViewDefinition[] = [];
  let elementStyles: C4ElementStyle[] = [];
  let relationshipStyles: C4RelationshipStyle[] = [];

  const ctx: ParserContext = {
    variables: new Map(),
    relationships: [],
    errors: []
  };

  for (const child of wsBlock.children) {
    if (child.keyword === 'model') {
      model = parseModelBlock(child, ctx);
    } else if (child.keyword === 'views') {
      const viewResult = parseViewsBlock(child);
      views = viewResult.views;
      elementStyles = viewResult.elementStyles;
      relationshipStyles = viewResult.relationshipStyles;
    }
  }

  return {
    name,
    description,
    model,
    views: {
      views,
      elementStyles,
      relationshipStyles
    }
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a Structurizr DSL files map into a C4Workspace.
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

  // Step 2: Strip comments
  dsl = stripComments(dsl);

  // Step 3: Build block tree
  try {
    const lines = dsl.split('\n');
    const root = buildBlockTree(lines);
    const workspace = parseWorkspaceBlock(root);
    return { workspace, error: null };
  } catch (err) {
    return {
      workspace: null,
      error: {
        message: `Parse error: ${err instanceof Error ? err.message : String(err)}`
      }
    };
  }
}
