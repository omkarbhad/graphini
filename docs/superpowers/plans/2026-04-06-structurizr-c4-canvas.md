# Structurizr C4 Architecture Canvas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full Structurizr DSL / C4 architecture diagram editor alongside the existing Mermaid editor, with its own canvas (SvelteFlow), parser, custom node components, file-tab editor, and AI chat integration.

**Architecture:** Workspaces gain an `engine` field (`'mermaid' | 'structurizr'`) chosen at creation time. Structurizr workspaces store multi-file DSL in a `files` map, parsed via `structurizr-parser` into a JSON workspace, transformed into SvelteFlow nodes/edges, and laid out with Dagre. A separate system prompt powers AI chat for Structurizr mode.

**Tech Stack:** SvelteKit, SvelteFlow (`@xyflow/svelte`), `structurizr-parser`, `dagre`, Drizzle ORM, Neon PostgreSQL, OpenRouter AI SDK

**Spec:** `docs/superpowers/specs/2026-04-06-structurizr-c4-canvas-design.md`

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install npm packages**

```bash
npm install @xyflow/svelte structurizr-parser dagre
npm install -D @types/dagre
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('@xyflow/svelte'); console.log('svelteflow ok')"
node -e "require('structurizr-parser'); console.log('parser ok')"
node -e "require('dagre'); console.log('dagre ok')"
```

Expected: All three print "ok" without errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add svelteflow, structurizr-parser, dagre dependencies"
```

---

## Task 2: Database Schema — Add `engine` Column

**Files:**
- Modify: `src/lib/server/db/schema.ts:404-428`

- [ ] **Step 1: Add engine column to Drizzle schema**

In `src/lib/server/db/schema.ts`, add the `engine` field to the `diagramWorkspaces` table definition, after the `element_count` field (line 411):

```typescript
export const diagramWorkspaces = pgTable(
  'diagram_workspaces',
  {
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    description: text('description'),
    diagram_type: text('diagram_type'),
    document: jsonb('document').notNull().default({}),
    element_count: integer('element_count').notNull().default(0),
    engine: text('engine').notNull().default('mermaid'),
    id: uuid('id').primaryKey().defaultRandom(),
    is_starred: boolean('is_starred').notNull().default(false),
    tags: text('tags')
      .array()
      .default(sql`'{}'`),
    thumbnail_url: text('thumbnail_url'),
    title: text('title').notNull().default('Untitled Workspace'),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
  },
  (t) => [
    index('idx_diagram_workspaces_user').on(t.user_id, t.updated_at),
    index('idx_diagram_workspaces_starred').on(t.user_id, t.is_starred)
  ]
);
```

- [ ] **Step 2: Run the migration on Neon**

Use the Neon MCP tool or Drizzle CLI to apply the migration:

```sql
ALTER TABLE diagram_workspaces ADD COLUMN IF NOT EXISTS engine TEXT NOT NULL DEFAULT 'mermaid';
```

- [ ] **Step 3: Update domain mapper in `src/lib/server/db/domains/models.ts`**

Add `engine` to the `mapDiagramWorkspace` function (around line 32):

```typescript
export function mapDiagramWorkspace(
  row: typeof schema.diagramWorkspaces.$inferSelect
): DiagramWorkspaceRow {
  return {
    created_at: row.created_at.toISOString(),
    description: row.description,
    diagram_type: row.diagram_type,
    document: (row.document as Record<string, unknown>) ?? {},
    element_count: row.element_count,
    engine: row.engine,
    id: row.id,
    is_starred: row.is_starred,
    tags: (row.tags as string[]) ?? [],
    thumbnail_url: row.thumbnail_url,
    title: row.title,
    updated_at: row.updated_at.toISOString(),
    user_id: row.user_id
  };
}
```

- [ ] **Step 4: Update `DiagramWorkspaceRow` type in `src/lib/server/db/types.ts`**

Add `engine: string` to the `DiagramWorkspaceRow` interface.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/db/schema.ts src/lib/server/db/domains/models.ts src/lib/server/db/types.ts
git commit -m "feat: add engine column to diagram_workspaces schema"
```

---

## Task 3: TypeScript Types — WorkspaceDocument & DiagramWorkspace

**Files:**
- Modify: `src/lib/types/workspace.ts`

- [ ] **Step 1: Add engine and files fields to WorkspaceDocument**

```typescript
export interface WorkspaceDocument {
  /** Schema version for future migrations */
  version: number;

  /** Rendering engine — determines which editor/canvas pipeline to use */
  engine: 'mermaid' | 'structurizr';

  /** Canvas state — elements, connections, viewport, grid */
  canvas: {
    elements: CanvasElement[];
    connections: CanvasConnection[];
    viewport: CanvasViewport;
    gridEnabled: boolean;
    gridSize: number;
    snapToGrid: boolean;
  };

  /** Mermaid code from the code editor panel */
  mermaidCode: string;

  /** Multi-file DSL storage for Structurizr — filename → content */
  files: Record<string, string>;

  /** Chat messages stored inline */
  chat: {
    messages: WorkspaceChatMessage[];
    /** Optional link to conversations table for credit tracking */
    conversationId?: string;
  };

  /** Document panel markdown */
  documentMarkdown: string;
}
```

- [ ] **Step 2: Add engine to DiagramWorkspace and DiagramWorkspaceSummary**

```typescript
export interface DiagramWorkspace {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  is_starred: boolean;
  tags: string[];
  document: WorkspaceDocument;
  element_count: number;
  engine: string;
  diagram_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiagramWorkspaceSummary {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  mermaid_preview: string | null;
  is_starred: boolean;
  tags: string[];
  element_count: number;
  engine: string;
  diagram_type: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 3: Update DEFAULT_WORKSPACE_DOCUMENT**

```typescript
export const DEFAULT_WORKSPACE_DOCUMENT: WorkspaceDocument = {
  canvas: {
    connections: [],
    elements: [],
    gridEnabled: true,
    gridSize: 20,
    snapToGrid: true,
    viewport: { x: 0, y: 0, zoom: 1 }
  },
  chat: { messages: [] },
  documentMarkdown: '',
  engine: 'mermaid',
  files: {},
  mermaidCode: '',
  version: 1
};
```

- [ ] **Step 4: Add Structurizr default document constant**

```typescript
export const DEFAULT_STRUCTURIZR_DOCUMENT: WorkspaceDocument = {
  canvas: {
    connections: [],
    elements: [],
    gridEnabled: true,
    gridSize: 20,
    snapToGrid: true,
    viewport: { x: 0, y: 0, zoom: 1 }
  },
  chat: { messages: [] },
  documentMarkdown: '',
  engine: 'structurizr',
  files: {
    'workspace.dsl': `workspace "Untitled" "Description" {

    model {
        user = person "User" "A user of the system"
        system = softwareSystem "System" "Description" {
            webapp = container "Web App" "" "React"
            api = container "API" "" "Node.js"
            db = container "Database" "" "PostgreSQL"
        }
        user -> webapp "Uses"
        webapp -> api "Calls"
        api -> db "Reads/Writes"
    }

    views {
        systemContext system "Context" {
            include *
            autoLayout
        }
        container system "Containers" {
            include *
            autoLayout
        }
    }
}`
  },
  mermaidCode: '',
  version: 1
};
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/types/workspace.ts
git commit -m "feat: add engine and files fields to workspace types"
```

---

## Task 4: API — Accept `engine` on Workspace Creation

**Files:**
- Modify: `src/routes/api/workspaces/+server.ts`

- [ ] **Step 1: Update create schema to accept engine**

```typescript
import { DEFAULT_STRUCTURIZR_DOCUMENT } from '$lib/types/workspace';

const createWorkspaceSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .default('Untitled Workspace'),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional()
    .nullable(),
  document: z.record(z.string(), z.unknown()).optional(),
  engine: z.enum(['mermaid', 'structurizr']).default('mermaid')
});
```

- [ ] **Step 2: Pass engine and default document to db.createDiagramWorkspace**

Update the POST handler body:

```typescript
const engine = parsed.data.engine;
const document = parsed.data.document ??
  (engine === 'structurizr' ? DEFAULT_STRUCTURIZR_DOCUMENT : undefined);

const workspace = await db.createDiagramWorkspace({
  user_id: user.id,
  title: parsed.data.title,
  description: parsed.data.description ?? undefined,
  document,
  engine
});
```

- [ ] **Step 3: Update `createDiagramWorkspace` in the DB adapter to accept engine**

In `src/lib/server/db/neon-adapter.ts` (or whichever adapter file has `createDiagramWorkspace`), add `engine` to the insert values. Find the function and add `engine: data.engine ?? 'mermaid'` to the `.values({...})` call.

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/workspaces/+server.ts src/lib/server/db/neon-adapter.ts
git commit -m "feat: accept engine parameter on workspace creation"
```

---

## Task 5: Workspace Store — Handle Structurizr State

**Files:**
- Modify: `src/lib/stores/workspace.svelte.ts`

- [ ] **Step 1: Update `createWorkspace` to accept engine parameter**

```typescript
async function createWorkspace(
  title?: string,
  engine: 'mermaid' | 'structurizr' = 'mermaid'
): Promise<DiagramWorkspace | null> {
  try {
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: title || 'Untitled Workspace', engine })
    });
    if (res.ok) return res.json();
    return null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Update `collectDocument` to include files and engine**

```typescript
function collectDocument(): WorkspaceDocument {
  const mermaidState = get(inputStateStore);
  const docMarkdown = documentMarkdownStore.value;
  const existingDoc = state.workspace?.document;
  const engine = existingDoc?.engine ?? 'mermaid';

  return {
    canvas: {
      connections: [],
      elements: [],
      gridEnabled: true,
      gridSize: 20,
      snapToGrid: true,
      viewport: { x: 0, y: 0, zoom: 1 }
    },
    chat: existingDoc?.chat || { messages: [] },
    documentMarkdown: docMarkdown || '',
    engine,
    files: existingDoc?.files ?? {},
    mermaidCode: engine === 'mermaid' ? (mermaidState?.code || '') : '',
    version: 1
  };
}
```

- [ ] **Step 3: Add `updateFile` and `getActiveFile` helpers**

Add these after the `addChatMessage` function:

```typescript
function updateFile(filename: string, content: string) {
  if (!state.workspace?.document) return;
  state.workspace = {
    ...state.workspace,
    document: {
      ...state.workspace.document,
      files: {
        ...state.workspace.document.files,
        [filename]: content
      }
    }
  };
  markDirty();
}

function deleteFile(filename: string) {
  if (!state.workspace?.document) return;
  const { [filename]: _, ...rest } = state.workspace.document.files;
  state.workspace = {
    ...state.workspace,
    document: {
      ...state.workspace.document,
      files: rest
    }
  };
  markDirty();
}

function renameFile(oldName: string, newName: string) {
  if (!state.workspace?.document) return;
  const files = { ...state.workspace.document.files };
  if (!(oldName in files)) return;
  files[newName] = files[oldName];
  delete files[oldName];
  state.workspace = {
    ...state.workspace,
    document: {
      ...state.workspace.document,
      files
    }
  };
  markDirty();
}
```

- [ ] **Step 4: Export new methods from workspaceStore**

Add to the `workspaceStore` export object:

```typescript
export const workspaceStore = {
  addChatMessage,
  create: createWorkspace,
  delete: deleteWorkspace,
  deleteFile,
  duplicate: duplicateWorkspace,
  // ... existing getters ...
  list: listWorkspaces,
  load,
  markDirty,
  renameFile,
  save,
  get state() { return state; },
  toggleStar,
  unload,
  updateFile,
  updateMeta,
  get workspace() { return state.workspace; }
};
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/workspace.svelte.ts
git commit -m "feat: workspace store supports engine, files, and file CRUD"
```

---

## Task 6: Structurizr Types

**Files:**
- Create: `src/lib/features/structurizr/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
/**
 * Structurizr C4 model types — derived from structurizr-parser output.
 */

export interface C4Person {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

export interface C4SoftwareSystem {
  id: string;
  name: string;
  description: string;
  tags: string[];
  containers: C4Container[];
}

export interface C4Container {
  id: string;
  name: string;
  description: string;
  technology: string;
  tags: string[];
  components: C4Component[];
}

export interface C4Component {
  id: string;
  name: string;
  description: string;
  technology: string;
  tags: string[];
}

export interface C4DeploymentNode {
  id: string;
  name: string;
  description: string;
  technology: string;
  tags: string[];
  children: C4DeploymentNode[];
  instances: string[]; // container IDs
}

export interface C4Relationship {
  sourceId: string;
  targetId: string;
  description: string;
  technology: string;
  tags: string[];
}

export interface C4Model {
  people: C4Person[];
  softwareSystems: C4SoftwareSystem[];
  relationships: C4Relationship[];
  deploymentEnvironments: {
    name: string;
    deploymentNodes: C4DeploymentNode[];
  }[];
}

export interface C4ViewDefinition {
  key: string;
  type: 'systemLandscape' | 'systemContext' | 'container' | 'component' | 'dynamic' | 'deployment';
  title: string;
  description?: string;
  softwareSystemId?: string;
  containerId?: string;
  autoLayout?: { direction: 'TB' | 'BT' | 'LR' | 'RL' };
  includes: string[]; // element IDs or '*'
  excludes: string[];
}

export interface C4ElementStyle {
  tag: string;
  background?: string;
  color?: string;
  shape?: string;
  border?: string;
  fontSize?: number;
  opacity?: number;
}

export interface C4RelationshipStyle {
  tag: string;
  color?: string;
  thickness?: number;
  dashed?: boolean;
  fontSize?: number;
}

export interface C4Views {
  views: C4ViewDefinition[];
  elementStyles: C4ElementStyle[];
  relationshipStyles: C4RelationshipStyle[];
}

export interface C4Workspace {
  name: string;
  description: string;
  model: C4Model;
  views: C4Views;
}

/** C4 element types for SvelteFlow node registration */
export type C4NodeType = 'person' | 'softwareSystem' | 'container' | 'component' | 'deploymentNode';

/** Default C4 color palette */
export const C4_COLORS: Record<C4NodeType, string> = {
  person: '#08427B',
  softwareSystem: '#1168BD',
  container: '#438DD5',
  component: '#85BBF0',
  deploymentNode: '#999999'
};

export const C4_TEXT_COLORS: Record<C4NodeType, string> = {
  person: '#FFFFFF',
  softwareSystem: '#FFFFFF',
  container: '#FFFFFF',
  component: '#000000',
  deploymentNode: '#000000'
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/features/structurizr/types.ts
git commit -m "feat: add C4 model types for structurizr"
```

---

## Task 7: Structurizr Parser Wrapper

**Files:**
- Create: `src/lib/features/structurizr/parser.ts`

- [ ] **Step 1: Create the parser module**

```typescript
/**
 * Structurizr DSL parser wrapper.
 * Resolves !include directives from the files map, then parses via structurizr-parser.
 */

import type { C4Workspace } from './types';

/**
 * Resolve !include directives by inlining file contents from the files map.
 * Prevents circular includes with a visited set.
 */
export function resolveIncludes(
  files: Record<string, string>,
  entryFile: string,
  visited: Set<string> = new Set()
): string {
  if (visited.has(entryFile)) {
    return `// Circular include detected: ${entryFile}`;
  }
  visited.add(entryFile);

  const content = files[entryFile];
  if (!content) return `// File not found: ${entryFile}`;

  return content.replace(/^\s*!include\s+(\S+)\s*$/gm, (_match, filename: string) => {
    return resolveIncludes(files, filename.trim(), visited);
  });
}

export interface ParseResult {
  workspace: C4Workspace | null;
  error: ParseError | null;
}

export interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

/**
 * Parse Structurizr DSL from a files map into a C4Workspace object.
 */
export async function parseStructurizrDSL(
  files: Record<string, string>,
  entryFile = 'workspace.dsl'
): Promise<ParseResult> {
  try {
    const resolvedDSL = resolveIncludes(files, entryFile);

    // Dynamic import to avoid SSR issues — structurizr-parser is browser-only
    const { StructurizrParser } = await import('structurizr-parser');
    const parser = new StructurizrParser();
    const parsed = parser.parse(resolvedDSL);

    // Map parser output to our C4Workspace type
    const workspace = mapParserOutput(parsed);
    return { workspace, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Try to extract line number from parser error messages
    const lineMatch = message.match(/line\s+(\d+)/i);
    const colMatch = message.match(/col(?:umn)?\s+(\d+)/i);
    return {
      workspace: null,
      error: {
        message,
        line: lineMatch ? parseInt(lineMatch[1]) : undefined,
        column: colMatch ? parseInt(colMatch[1]) : undefined
      }
    };
  }
}

/**
 * Map the raw parser output to our typed C4Workspace.
 * The structurizr-parser package returns a loosely typed JSON workspace object.
 * This function normalizes it to our strict types.
 */
function mapParserOutput(parsed: Record<string, unknown>): C4Workspace {
  const model = parsed.model as Record<string, unknown> ?? {};
  const views = parsed.views as Record<string, unknown> ?? {};

  return {
    name: (parsed.name as string) ?? 'Untitled',
    description: (parsed.description as string) ?? '',
    model: {
      people: extractPeople(model),
      softwareSystems: extractSoftwareSystems(model),
      relationships: extractRelationships(model),
      deploymentEnvironments: extractDeploymentEnvironments(model)
    },
    views: {
      views: extractViews(views),
      elementStyles: extractElementStyles(views),
      relationshipStyles: extractRelationshipStyles(views)
    }
  };
}

// --- Extraction helpers ---
// These inspect the parser's raw JSON and normalize to typed arrays.
// The structurizr-parser output shape may vary; these are defensive.

function extractPeople(model: Record<string, unknown>): C4Workspace['model']['people'] {
  const people = (model.people ?? model.elements ?? []) as Record<string, unknown>[];
  return people
    .filter((e) => e.type === 'Person' || e.type === 'person')
    .map((p) => ({
      id: String(p.id ?? p.name ?? ''),
      name: String(p.name ?? ''),
      description: String(p.description ?? ''),
      tags: Array.isArray(p.tags) ? p.tags.map(String) : []
    }));
}

function extractSoftwareSystems(model: Record<string, unknown>): C4Workspace['model']['softwareSystems'] {
  const systems = (model.softwareSystems ?? model.elements ?? []) as Record<string, unknown>[];
  return systems
    .filter((e) => e.type === 'SoftwareSystem' || e.type === 'softwareSystem')
    .map((s) => ({
      id: String(s.id ?? s.name ?? ''),
      name: String(s.name ?? ''),
      description: String(s.description ?? ''),
      tags: Array.isArray(s.tags) ? s.tags.map(String) : [],
      containers: extractContainers(s)
    }));
}

function extractContainers(system: Record<string, unknown>): C4Workspace['model']['softwareSystems'][0]['containers'] {
  const containers = (system.containers ?? []) as Record<string, unknown>[];
  return containers.map((c) => ({
    id: String(c.id ?? c.name ?? ''),
    name: String(c.name ?? ''),
    description: String(c.description ?? ''),
    technology: String(c.technology ?? ''),
    tags: Array.isArray(c.tags) ? c.tags.map(String) : [],
    components: extractComponents(c)
  }));
}

function extractComponents(container: Record<string, unknown>): C4Workspace['model']['softwareSystems'][0]['containers'][0]['components'] {
  const components = (container.components ?? []) as Record<string, unknown>[];
  return components.map((c) => ({
    id: String(c.id ?? c.name ?? ''),
    name: String(c.name ?? ''),
    description: String(c.description ?? ''),
    technology: String(c.technology ?? ''),
    tags: Array.isArray(c.tags) ? c.tags.map(String) : []
  }));
}

function extractRelationships(model: Record<string, unknown>): C4Workspace['model']['relationships'] {
  const rels = (model.relationships ?? []) as Record<string, unknown>[];
  return rels.map((r) => ({
    sourceId: String(r.sourceId ?? r.source ?? ''),
    targetId: String(r.targetId ?? r.destination ?? r.target ?? ''),
    description: String(r.description ?? ''),
    technology: String(r.technology ?? ''),
    tags: Array.isArray(r.tags) ? r.tags.map(String) : []
  }));
}

function extractDeploymentEnvironments(model: Record<string, unknown>): C4Workspace['model']['deploymentEnvironments'] {
  const envs = (model.deploymentEnvironments ?? []) as Record<string, unknown>[];
  return envs.map((env) => ({
    name: String(env.name ?? ''),
    deploymentNodes: extractDeploymentNodes(env)
  }));
}

function extractDeploymentNodes(parent: Record<string, unknown>): C4Workspace['model']['deploymentEnvironments'][0]['deploymentNodes'] {
  const nodes = (parent.deploymentNodes ?? parent.children ?? []) as Record<string, unknown>[];
  return nodes.map((n) => ({
    id: String(n.id ?? n.name ?? ''),
    name: String(n.name ?? ''),
    description: String(n.description ?? ''),
    technology: String(n.technology ?? ''),
    tags: Array.isArray(n.tags) ? n.tags.map(String) : [],
    children: extractDeploymentNodes(n),
    instances: Array.isArray(n.instances) ? n.instances.map(String) : []
  }));
}

function extractViews(views: Record<string, unknown>): C4Workspace['views']['views'] {
  const result: C4Workspace['views']['views'] = [];

  const viewTypes = [
    { key: 'systemLandscapeViews', type: 'systemLandscape' as const },
    { key: 'systemContextViews', type: 'systemContext' as const },
    { key: 'containerViews', type: 'container' as const },
    { key: 'componentViews', type: 'component' as const },
    { key: 'dynamicViews', type: 'dynamic' as const },
    { key: 'deploymentViews', type: 'deployment' as const }
  ];

  for (const { key, type } of viewTypes) {
    const viewList = (views[key] ?? []) as Record<string, unknown>[];
    for (const v of viewList) {
      const autoLayout = v.autoLayout as Record<string, unknown> | undefined;
      result.push({
        key: String(v.key ?? v.title ?? type),
        type,
        title: String(v.title ?? v.key ?? type),
        description: v.description ? String(v.description) : undefined,
        softwareSystemId: v.softwareSystemId ? String(v.softwareSystemId) : undefined,
        containerId: v.containerId ? String(v.containerId) : undefined,
        autoLayout: autoLayout ? {
          direction: (String(autoLayout.direction ?? autoLayout.rankDirection ?? 'TB') as 'TB' | 'BT' | 'LR' | 'RL')
        } : undefined,
        includes: Array.isArray(v.includes) ? v.includes.map(String) : ['*'],
        excludes: Array.isArray(v.excludes) ? v.excludes.map(String) : []
      });
    }
  }

  return result;
}

function extractElementStyles(views: Record<string, unknown>): C4Workspace['views']['elementStyles'] {
  const styles = views.styles as Record<string, unknown> | undefined;
  if (!styles) return [];
  const elements = (styles.elements ?? []) as Record<string, unknown>[];
  return elements.map((s) => ({
    tag: String(s.tag ?? ''),
    background: s.background ? String(s.background) : undefined,
    color: s.color ? String(s.color) : undefined,
    shape: s.shape ? String(s.shape) : undefined,
    border: s.border ? String(s.border) : undefined,
    fontSize: typeof s.fontSize === 'number' ? s.fontSize : undefined,
    opacity: typeof s.opacity === 'number' ? s.opacity : undefined
  }));
}

function extractRelationshipStyles(views: Record<string, unknown>): C4Workspace['views']['relationshipStyles'] {
  const styles = views.styles as Record<string, unknown> | undefined;
  if (!styles) return [];
  const rels = (styles.relationships ?? []) as Record<string, unknown>[];
  return rels.map((s) => ({
    tag: String(s.tag ?? ''),
    color: s.color ? String(s.color) : undefined,
    thickness: typeof s.thickness === 'number' ? s.thickness : undefined,
    dashed: typeof s.dashed === 'boolean' ? s.dashed : undefined,
    fontSize: typeof s.fontSize === 'number' ? s.fontSize : undefined
  }));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/features/structurizr/parser.ts
git commit -m "feat: structurizr DSL parser wrapper with include resolution"
```

---

## Task 8: SvelteFlow Transformer — C4 Workspace to Nodes/Edges

**Files:**
- Create: `src/lib/features/structurizr/transformer.ts`

- [ ] **Step 1: Create the transformer module**

```typescript
/**
 * Transforms a C4Workspace into SvelteFlow nodes and edges.
 * Filters based on the active view definition.
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
  C4_COLORS,
  C4_TEXT_COLORS
} from './types';
import { C4_COLORS as COLORS, C4_TEXT_COLORS as TEXT_COLORS } from './types';

interface C4NodeData {
  label: string;
  description: string;
  technology?: string;
  c4Type: C4NodeType;
  typeLabel: string;
  bgColor: string;
  textColor: string;
  tags: string[];
}

export interface TransformResult {
  nodes: Node<C4NodeData>[];
  edges: Edge[];
  viewTitle: string;
}

/**
 * Transform a parsed C4 workspace + selected view into SvelteFlow graph data.
 */
export function transformToSvelteFlow(
  workspace: C4Workspace,
  viewKey: string
): TransformResult {
  const view = workspace.views.views.find((v) => v.key === viewKey);
  if (!view) {
    return { nodes: [], edges: [], viewTitle: 'No view selected' };
  }

  const { nodes, elementIds } = buildNodes(workspace, view);
  const edges = buildEdges(workspace, elementIds, view);

  return { nodes, edges, viewTitle: view.title || view.key };
}

/**
 * Get the list of available views from a workspace.
 */
export function getAvailableViews(workspace: C4Workspace): { key: string; title: string; type: string }[] {
  return workspace.views.views.map((v) => ({
    key: v.key,
    title: v.title || v.key,
    type: v.type
  }));
}

function buildNodes(
  workspace: C4Workspace,
  view: C4ViewDefinition
): { nodes: Node<C4NodeData>[]; elementIds: Set<string> } {
  const nodes: Node<C4NodeData>[] = [];
  const elementIds = new Set<string>();
  const includeAll = view.includes.includes('*');

  const { model } = workspace;

  switch (view.type) {
    case 'systemLandscape':
    case 'systemContext': {
      // Show people and software systems
      for (const person of model.people) {
        if (includeAll || view.includes.includes(person.id)) {
          nodes.push(makeNode(person.id, person.name, person.description, '', 'person', person.tags, workspace));
          elementIds.add(person.id);
        }
      }
      for (const sys of model.softwareSystems) {
        if (includeAll || view.includes.includes(sys.id)) {
          nodes.push(makeNode(sys.id, sys.name, sys.description, '', 'softwareSystem', sys.tags, workspace));
          elementIds.add(sys.id);
        }
      }
      break;
    }

    case 'container': {
      // Show people, external systems, and containers of the target system
      for (const person of model.people) {
        if (includeAll || view.includes.includes(person.id)) {
          nodes.push(makeNode(person.id, person.name, person.description, '', 'person', person.tags, workspace));
          elementIds.add(person.id);
        }
      }
      for (const sys of model.softwareSystems) {
        if (sys.id === view.softwareSystemId) {
          // Show containers of this system
          for (const container of sys.containers) {
            if (includeAll || view.includes.includes(container.id)) {
              nodes.push(makeNode(container.id, container.name, container.description, container.technology, 'container', container.tags, workspace));
              elementIds.add(container.id);
            }
          }
        } else if (includeAll || view.includes.includes(sys.id)) {
          // External system
          nodes.push(makeNode(sys.id, sys.name, sys.description, '', 'softwareSystem', sys.tags, workspace));
          elementIds.add(sys.id);
        }
      }
      break;
    }

    case 'component': {
      // Show components of target container + external elements
      for (const sys of model.softwareSystems) {
        for (const container of sys.containers) {
          if (container.id === view.containerId) {
            for (const comp of container.components) {
              if (includeAll || view.includes.includes(comp.id)) {
                nodes.push(makeNode(comp.id, comp.name, comp.description, comp.technology, 'component', comp.tags, workspace));
                elementIds.add(comp.id);
              }
            }
          } else if (includeAll || view.includes.includes(container.id)) {
            nodes.push(makeNode(container.id, container.name, container.description, container.technology, 'container', container.tags, workspace));
            elementIds.add(container.id);
          }
        }
      }
      break;
    }

    default:
      // For dynamic/deployment views, show all included elements
      break;
  }

  return { nodes, elementIds };
}

function makeNode(
  id: string,
  name: string,
  description: string,
  technology: string,
  c4Type: C4NodeType,
  tags: string[],
  workspace: C4Workspace
): Node<C4NodeData> {
  // Check for style overrides from the workspace
  const style = findStyleForTags(tags, c4Type, workspace);

  return {
    id,
    type: c4Type,
    position: { x: 0, y: 0 }, // Dagre will position these
    data: {
      label: name,
      description,
      technology: technology || undefined,
      c4Type,
      typeLabel: typeLabels[c4Type],
      bgColor: style.background ?? COLORS[c4Type],
      textColor: style.color ?? TEXT_COLORS[c4Type],
      tags
    }
  };
}

const typeLabels: Record<C4NodeType, string> = {
  person: 'Person',
  softwareSystem: 'Software System',
  container: 'Container',
  component: 'Component',
  deploymentNode: 'Deployment Node'
};

function findStyleForTags(
  tags: string[],
  c4Type: C4NodeType,
  workspace: C4Workspace
): { background?: string; color?: string } {
  // Check element styles — last matching tag wins
  for (const style of workspace.views.elementStyles) {
    if (tags.includes(style.tag) || style.tag === typeLabels[c4Type]) {
      return { background: style.background, color: style.color };
    }
  }
  return {};
}

function buildEdges(
  workspace: C4Workspace,
  elementIds: Set<string>,
  view: C4ViewDefinition
): Edge[] {
  return workspace.model.relationships
    .filter((r) => elementIds.has(r.sourceId) && elementIds.has(r.targetId))
    .map((r, i) => ({
      id: `e-${r.sourceId}-${r.targetId}-${i}`,
      source: r.sourceId,
      target: r.targetId,
      label: r.description + (r.technology ? ` [${r.technology}]` : ''),
      type: 'default',
      animated: false,
      style: `stroke: #707070; stroke-width: 2px;`,
      labelStyle: `font-size: 11px; fill: #666;`
    }));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/features/structurizr/transformer.ts
git commit -m "feat: transform C4 workspace to SvelteFlow nodes/edges"
```

---

## Task 9: Dagre Auto-Layout

**Files:**
- Create: `src/lib/features/structurizr/layout.ts`

- [ ] **Step 1: Create the layout module**

```typescript
/**
 * Dagre-based auto-layout for C4 diagrams.
 */

import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/svelte';

interface LayoutOptions {
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  nodeWidth?: number;
  nodeHeight?: number;
  rankSep?: number;
  nodeSep?: number;
}

const DEFAULTS: Required<LayoutOptions> = {
  direction: 'TB',
  nodeWidth: 280,
  nodeHeight: 160,
  rankSep: 80,
  nodeSep: 60
};

/**
 * Apply Dagre layout to SvelteFlow nodes/edges.
 * Returns new node array with updated positions.
 * Optionally preserves manually set positions from `overrides`.
 */
export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options?: LayoutOptions,
  positionOverrides?: Record<string, { x: number; y: number }>
): Node[] {
  const opts = { ...DEFAULTS, ...options };

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: opts.direction,
    ranksep: opts.rankSep,
    nodesep: opts.nodeSep,
    marginx: 40,
    marginy: 40
  });

  for (const node of nodes) {
    g.setNode(node.id, { width: opts.nodeWidth, height: opts.nodeHeight });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    // Use manual override if available
    if (positionOverrides?.[node.id]) {
      return { ...node, position: positionOverrides[node.id] };
    }

    const dagreNode = g.node(node.id);
    return {
      ...node,
      position: {
        x: dagreNode.x - opts.nodeWidth / 2,
        y: dagreNode.y - opts.nodeHeight / 2
      }
    };
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/features/structurizr/layout.ts
git commit -m "feat: dagre auto-layout for C4 diagrams"
```

---

## Task 10: Custom C4 Node Components

**Files:**
- Create: `src/lib/features/structurizr/components/nodes/PersonNode.svelte`
- Create: `src/lib/features/structurizr/components/nodes/SoftwareSystemNode.svelte`
- Create: `src/lib/features/structurizr/components/nodes/ContainerNode.svelte`
- Create: `src/lib/features/structurizr/components/nodes/ComponentNode.svelte`
- Create: `src/lib/features/structurizr/components/nodes/DeploymentNode.svelte`

- [ ] **Step 1: Create PersonNode**

```svelte
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';

  type $$Props = {
    data: {
      label: string;
      description: string;
      bgColor: string;
      textColor: string;
      typeLabel: string;
    };
  };

  export let data: $$Props['data'];
</script>

<div class="c4-node c4-person" style="--bg: {data.bgColor}; --text: {data.textColor};">
  <div class="c4-person-icon">
    <svg viewBox="0 0 24 24" width="32" height="32" fill={data.textColor}>
      <circle cx="12" cy="7" r="4" />
      <path d="M12 13c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z" />
    </svg>
  </div>
  <div class="c4-name">{data.label}</div>
  <div class="c4-type">[{data.typeLabel}]</div>
  {#if data.description}
    <div class="c4-desc">{data.description}</div>
  {/if}
  <Handle type="target" position={Position.Top} />
  <Handle type="source" position={Position.Bottom} />
</div>

<style>
  .c4-node {
    background: var(--bg);
    color: var(--text);
    border-radius: 8px;
    padding: 16px 20px;
    min-width: 220px;
    max-width: 280px;
    text-align: center;
    font-family: inherit;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
  .c4-person-icon {
    margin-bottom: 8px;
  }
  .c4-name {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 2px;
  }
  .c4-type {
    font-size: 10px;
    opacity: 0.7;
    margin-bottom: 6px;
  }
  .c4-desc {
    font-size: 11px;
    opacity: 0.85;
    line-height: 1.4;
  }
</style>
```

- [ ] **Step 2: Create SoftwareSystemNode**

```svelte
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';

  type $$Props = {
    data: {
      label: string;
      description: string;
      bgColor: string;
      textColor: string;
      typeLabel: string;
    };
  };

  export let data: $$Props['data'];
</script>

<div class="c4-node" style="--bg: {data.bgColor}; --text: {data.textColor};">
  <div class="c4-name">{data.label}</div>
  <div class="c4-type">[{data.typeLabel}]</div>
  {#if data.description}
    <div class="c4-desc">{data.description}</div>
  {/if}
  <Handle type="target" position={Position.Top} />
  <Handle type="source" position={Position.Bottom} />
</div>

<style>
  .c4-node {
    background: var(--bg);
    color: var(--text);
    border-radius: 10px;
    padding: 20px 24px;
    min-width: 240px;
    max-width: 300px;
    text-align: center;
    font-family: inherit;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
  .c4-name {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 2px;
  }
  .c4-type {
    font-size: 10px;
    opacity: 0.7;
    margin-bottom: 6px;
  }
  .c4-desc {
    font-size: 11px;
    opacity: 0.85;
    line-height: 1.4;
  }
</style>
```

- [ ] **Step 3: Create ContainerNode**

```svelte
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';

  type $$Props = {
    data: {
      label: string;
      description: string;
      technology?: string;
      bgColor: string;
      textColor: string;
      typeLabel: string;
    };
  };

  export let data: $$Props['data'];
</script>

<div class="c4-node" style="--bg: {data.bgColor}; --text: {data.textColor};">
  <div class="c4-name">{data.label}</div>
  <div class="c4-type">[{data.typeLabel}{data.technology ? `: ${data.technology}` : ''}]</div>
  {#if data.description}
    <div class="c4-desc">{data.description}</div>
  {/if}
  <Handle type="target" position={Position.Top} />
  <Handle type="source" position={Position.Bottom} />
</div>

<style>
  .c4-node {
    background: var(--bg);
    color: var(--text);
    border-radius: 8px;
    padding: 16px 20px;
    min-width: 220px;
    max-width: 280px;
    text-align: center;
    font-family: inherit;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
  .c4-name {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 2px;
  }
  .c4-type {
    font-size: 10px;
    opacity: 0.7;
    margin-bottom: 6px;
  }
  .c4-desc {
    font-size: 11px;
    opacity: 0.85;
    line-height: 1.4;
  }
</style>
```

- [ ] **Step 4: Create ComponentNode**

Same structure as ContainerNode — copy the ContainerNode above. The only difference is the default color which is handled via `data.bgColor`/`data.textColor` from the transformer.

```svelte
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';

  type $$Props = {
    data: {
      label: string;
      description: string;
      technology?: string;
      bgColor: string;
      textColor: string;
      typeLabel: string;
    };
  };

  export let data: $$Props['data'];
</script>

<div class="c4-node" style="--bg: {data.bgColor}; --text: {data.textColor};">
  <div class="c4-name">{data.label}</div>
  <div class="c4-type">[{data.typeLabel}{data.technology ? `: ${data.technology}` : ''}]</div>
  {#if data.description}
    <div class="c4-desc">{data.description}</div>
  {/if}
  <Handle type="target" position={Position.Top} />
  <Handle type="source" position={Position.Bottom} />
</div>

<style>
  .c4-node {
    background: var(--bg);
    color: var(--text);
    border-radius: 8px;
    padding: 16px 20px;
    min-width: 200px;
    max-width: 260px;
    text-align: center;
    font-family: inherit;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
  .c4-name {
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 2px;
  }
  .c4-type {
    font-size: 10px;
    opacity: 0.7;
    margin-bottom: 6px;
  }
  .c4-desc {
    font-size: 11px;
    opacity: 0.85;
    line-height: 1.4;
  }
</style>
```

- [ ] **Step 5: Create DeploymentNode**

```svelte
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';

  type $$Props = {
    data: {
      label: string;
      description: string;
      technology?: string;
      bgColor: string;
      textColor: string;
      typeLabel: string;
    };
  };

  export let data: $$Props['data'];
</script>

<div class="c4-deployment-node" style="--bg: {data.bgColor}; --text: {data.textColor};">
  <div class="c4-name">{data.label}</div>
  <div class="c4-type">[{data.typeLabel}{data.technology ? `: ${data.technology}` : ''}]</div>
  {#if data.description}
    <div class="c4-desc">{data.description}</div>
  {/if}
  <Handle type="target" position={Position.Top} />
  <Handle type="source" position={Position.Bottom} />
</div>

<style>
  .c4-deployment-node {
    background: transparent;
    color: var(--text);
    border: 2px dashed var(--bg);
    border-radius: 8px;
    padding: 16px 20px;
    min-width: 240px;
    max-width: 320px;
    text-align: center;
    font-family: inherit;
  }
  .c4-name {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 2px;
  }
  .c4-type {
    font-size: 10px;
    opacity: 0.7;
    margin-bottom: 6px;
  }
  .c4-desc {
    font-size: 11px;
    opacity: 0.7;
    line-height: 1.4;
  }
</style>
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/features/structurizr/components/nodes/
git commit -m "feat: custom C4 node components for SvelteFlow"
```

---

## Task 11: FileTabs Component

**Files:**
- Create: `src/lib/features/structurizr/components/FileTabs.svelte`

- [ ] **Step 1: Create FileTabs component**

```svelte
<script lang="ts">
  import { Plus, X } from 'lucide-svelte';

  interface Props {
    files: Record<string, string>;
    activeFile: string;
    onSelect: (filename: string) => void;
    onCreate: (filename: string) => void;
    onDelete: (filename: string) => void;
    onRename: (oldName: string, newName: string) => void;
  }

  let { files, activeFile, onSelect, onCreate, onDelete, onRename }: Props = $props();

  let creating = $state(false);
  let newFileName = $state('');
  let renamingFile = $state<string | null>(null);
  let renameValue = $state('');

  function handleCreate() {
    const name = newFileName.trim();
    if (!name) return;
    const filename = name.endsWith('.dsl') ? name : `${name}.dsl`;
    if (filename in files) return;
    onCreate(filename);
    newFileName = '';
    creating = false;
  }

  function handleRename(oldName: string) {
    const newName = renameValue.trim();
    if (!newName || newName === oldName) {
      renamingFile = null;
      return;
    }
    const filename = newName.endsWith('.dsl') ? newName : `${newName}.dsl`;
    if (filename in files) {
      renamingFile = null;
      return;
    }
    onRename(oldName, filename);
    renamingFile = null;
  }

  function handleContextMenu(e: MouseEvent, filename: string) {
    e.preventDefault();
    // Only allow rename/delete on non-main files
    if (filename === 'workspace.dsl') return;
    renamingFile = filename;
    renameValue = filename.replace('.dsl', '');
  }
</script>

<div class="file-tabs">
  {#each Object.keys(files) as filename (filename)}
    {#if renamingFile === filename}
      <div class="file-tab active">
        <input
          class="rename-input"
          bind:value={renameValue}
          onkeydown={(e) => {
            if (e.key === 'Enter') handleRename(filename);
            if (e.key === 'Escape') renamingFile = null;
          }}
          onblur={() => handleRename(filename)}
          autofocus />
      </div>
    {:else}
      <button
        class="file-tab"
        class:active={activeFile === filename}
        onclick={() => onSelect(filename)}
        oncontextmenu={(e) => handleContextMenu(e, filename)}>
        <span class="file-name">{filename}</span>
        {#if filename !== 'workspace.dsl'}
          <button
            class="file-close"
            onclick|stopPropagation={() => onDelete(filename)}
            aria-label="Delete {filename}">
            <X class="size-3" />
          </button>
        {/if}
      </button>
    {/if}
  {/each}

  {#if creating}
    <div class="file-tab active">
      <input
        class="rename-input"
        bind:value={newFileName}
        placeholder="filename.dsl"
        onkeydown={(e) => {
          if (e.key === 'Enter') handleCreate();
          if (e.key === 'Escape') creating = false;
        }}
        onblur={handleCreate}
        autofocus />
    </div>
  {:else}
    <button class="file-tab add-tab" onclick={() => (creating = true)} aria-label="Add file">
      <Plus class="size-3.5" />
    </button>
  {/if}
</div>

<style>
  .file-tabs {
    display: flex;
    align-items: center;
    gap: 1px;
    overflow-x: auto;
    flex: 1;
    min-width: 0;
  }
  .file-tab {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 500;
    color: var(--muted-foreground);
    cursor: pointer;
    border: none;
    background: none;
    white-space: nowrap;
    border-radius: 4px;
    transition: background 100ms ease, color 100ms ease;
  }
  .file-tab:hover {
    background: hsl(var(--muted) / 0.5);
    color: var(--foreground);
  }
  .file-tab.active {
    background: hsl(var(--muted) / 0.8);
    color: var(--foreground);
  }
  .file-close {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1px;
    border: none;
    background: none;
    color: var(--muted-foreground);
    cursor: pointer;
    border-radius: 2px;
    opacity: 0;
    transition: opacity 100ms ease;
  }
  .file-tab:hover .file-close {
    opacity: 1;
  }
  .file-close:hover {
    background: hsl(var(--destructive) / 0.15);
    color: var(--destructive);
  }
  .add-tab {
    color: var(--muted-foreground);
    padding: 4px 8px;
  }
  .rename-input {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 3px;
    font-size: 11px;
    padding: 1px 4px;
    color: var(--foreground);
    width: 100px;
    outline: none;
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/features/structurizr/components/FileTabs.svelte
git commit -m "feat: file tabs component for structurizr multi-file editing"
```

---

## Task 12: ViewSelector Component

**Files:**
- Create: `src/lib/features/structurizr/components/ViewSelector.svelte`

- [ ] **Step 1: Create ViewSelector component**

```svelte
<script lang="ts">
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { ChevronDown, Layers } from 'lucide-svelte';

  interface ViewOption {
    key: string;
    title: string;
    type: string;
  }

  interface Props {
    views: ViewOption[];
    activeViewKey: string;
    onSelect: (key: string) => void;
  }

  let { views, activeViewKey, onSelect }: Props = $props();

  const activeView = $derived(views.find((v) => v.key === activeViewKey));

  const typeLabels: Record<string, string> = {
    systemLandscape: 'Landscape',
    systemContext: 'Context',
    container: 'Container',
    component: 'Component',
    dynamic: 'Dynamic',
    deployment: 'Deployment'
  };
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    <button
      class="flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/50">
      <Layers class="size-3.5 text-muted-foreground" />
      {activeView?.title ?? 'Select view'}
      <ChevronDown class="size-3 text-muted-foreground" />
    </button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="start" class="min-w-[180px]">
    {#each views as view (view.key)}
      <DropdownMenu.Item
        class={view.key === activeViewKey ? 'bg-muted' : ''}
        onclick={() => onSelect(view.key)}>
        <span class="mr-2 inline-block rounded bg-muted px-1 py-0.5 text-[9px] font-semibold text-muted-foreground">
          {typeLabels[view.type] ?? view.type}
        </span>
        {view.title}
      </DropdownMenu.Item>
    {/each}
    {#if views.length === 0}
      <DropdownMenu.Item disabled>No views defined in DSL</DropdownMenu.Item>
    {/if}
  </DropdownMenu.Content>
</DropdownMenu.Root>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/features/structurizr/components/ViewSelector.svelte
git commit -m "feat: view selector dropdown for C4 diagrams"
```

---

## Task 13: StructurizrView — Main SvelteFlow Canvas

**Files:**
- Create: `src/lib/features/structurizr/components/StructurizrView.svelte`

- [ ] **Step 1: Create the main canvas component**

```svelte
<script lang="ts">
  import { SvelteFlow, Background, Controls, MiniMap, type NodeTypes } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { parseStructurizrDSL } from '../parser';
  import { transformToSvelteFlow, getAvailableViews } from '../transformer';
  import { applyDagreLayout } from '../layout';
  import type { C4Workspace } from '../types';
  import ViewSelector from './ViewSelector.svelte';
  import PersonNode from './nodes/PersonNode.svelte';
  import SoftwareSystemNode from './nodes/SoftwareSystemNode.svelte';
  import ContainerNode from './nodes/ContainerNode.svelte';
  import ComponentNode from './nodes/ComponentNode.svelte';
  import DeploymentNode from './nodes/DeploymentNode.svelte';
  import type { Node, Edge } from '@xyflow/svelte';
  import { mode } from 'mode-watcher';

  interface Props {
    files: Record<string, string>;
    gridEnabled?: boolean;
  }

  let { files, gridEnabled = true }: Props = $props();

  const nodeTypes: NodeTypes = {
    person: PersonNode,
    softwareSystem: SoftwareSystemNode,
    container: ContainerNode,
    component: ComponentNode,
    deploymentNode: DeploymentNode
  };

  let nodes = $state<Node[]>([]);
  let edges = $state<Edge[]>([]);
  let workspace = $state<C4Workspace | null>(null);
  let parseError = $state<string | null>(null);
  let activeViewKey = $state('');
  let availableViews = $state<{ key: string; title: string; type: string }[]>([]);
  let positionOverrides = $state<Record<string, { x: number; y: number }>>({});

  // Parse and render when files change
  $effect(() => {
    // Depend on files object
    void files;
    parseAndRender();
  });

  async function parseAndRender() {
    const result = await parseStructurizrDSL(files);
    if (result.error) {
      parseError = result.error.message;
      workspace = null;
      nodes = [];
      edges = [];
      availableViews = [];
      return;
    }

    parseError = null;
    workspace = result.workspace;
    availableViews = getAvailableViews(workspace!);

    // Select first view if none active or active view no longer exists
    if (!activeViewKey || !availableViews.find((v) => v.key === activeViewKey)) {
      activeViewKey = availableViews[0]?.key ?? '';
    }

    renderView();
  }

  function renderView() {
    if (!workspace || !activeViewKey) return;

    const view = workspace.views.views.find((v) => v.key === activeViewKey);
    const direction = view?.autoLayout?.direction ?? 'TB';

    const result = transformToSvelteFlow(workspace, activeViewKey);
    const layoutedNodes = applyDagreLayout(
      result.nodes,
      result.edges,
      { direction },
      positionOverrides
    );

    nodes = layoutedNodes;
    edges = result.edges;
  }

  function handleViewChange(key: string) {
    activeViewKey = key;
    positionOverrides = {}; // Reset manual positions on view change
    renderView();
  }

  function handleNodeDrag(event: CustomEvent) {
    const node = event.detail.node as Node;
    positionOverrides = {
      ...positionOverrides,
      [node.id]: node.position
    };
  }

  function handleRelayout() {
    positionOverrides = {};
    renderView();
  }
</script>

<div class="structurizr-canvas">
  {#if parseError}
    <div class="parse-error">
      <span class="error-label">Parse Error</span>
      <span class="error-message">{parseError}</span>
    </div>
  {/if}

  <div class="canvas-toolbar">
    <ViewSelector
      views={availableViews}
      {activeViewKey}
      onSelect={handleViewChange} />
    <button
      class="toolbar-btn"
      onclick={handleRelayout}
      title="Re-layout">
      Auto Layout
    </button>
  </div>

  <div class="canvas-area">
    <SvelteFlow
      {nodes}
      {edges}
      {nodeTypes}
      fitView
      onNodeDragStop={handleNodeDrag}
      colorMode={$mode === 'dark' ? 'dark' : 'light'}>
      {#if gridEnabled}
        <Background />
      {/if}
      <Controls />
      <MiniMap />
    </SvelteFlow>
  </div>
</div>

<style>
  .structurizr-canvas {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    position: relative;
  }
  .canvas-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-bottom: 1px solid var(--border);
    background: var(--card);
    z-index: 10;
  }
  .toolbar-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 28px;
    padding: 0 10px;
    font-size: 11px;
    font-weight: 500;
    color: var(--muted-foreground);
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: 6px;
    cursor: pointer;
    transition: background 100ms ease;
  }
  .toolbar-btn:hover {
    background: hsl(var(--muted) / 0.5);
    color: var(--foreground);
  }
  .canvas-area {
    flex: 1;
    min-height: 0;
  }
  .parse-error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: hsl(var(--destructive) / 0.1);
    border-bottom: 1px solid hsl(var(--destructive) / 0.2);
    font-size: 12px;
  }
  .error-label {
    font-weight: 600;
    color: var(--destructive);
    font-size: 11px;
  }
  .error-message {
    color: var(--destructive);
    opacity: 0.8;
    font-size: 11px;
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/features/structurizr/components/StructurizrView.svelte
git commit -m "feat: main StructurizrView canvas with SvelteFlow"
```

---

## Task 14: Workspace Route — Conditional Rendering

**Files:**
- Modify: `src/routes/workspace/[id]/+page.svelte`

- [ ] **Step 1: Import Structurizr components**

Add these imports at the top of the `<script>` tag (after existing imports):

```typescript
import StructurizrView from '$lib/features/structurizr/components/StructurizrView.svelte';
import FileTabs from '$lib/features/structurizr/components/FileTabs.svelte';
```

- [ ] **Step 2: Add Structurizr state variables**

After the existing state variables (around line 80), add:

```typescript
let activeStructurizrFile = $state('workspace.dsl');

const isStructurizr = $derived(
  workspaceStore.workspace?.document?.engine === 'structurizr'
);

const structurizrFiles = $derived(
  workspaceStore.workspace?.document?.files ?? {}
);
```

- [ ] **Step 3: Add file management handlers**

```typescript
function handleFileSelect(filename: string) {
  activeStructurizrFile = filename;
}

function handleFileCreate(filename: string) {
  workspaceStore.updateFile(filename, '');
  activeStructurizrFile = filename;
}

function handleFileDelete(filename: string) {
  workspaceStore.deleteFile(filename);
  if (activeStructurizrFile === filename) {
    activeStructurizrFile = 'workspace.dsl';
  }
}

function handleFileRename(oldName: string, newName: string) {
  workspaceStore.renameFile(oldName, newName);
  if (activeStructurizrFile === oldName) {
    activeStructurizrFile = newName;
  }
}
```

- [ ] **Step 4: Replace the Code/Config switcher for Structurizr mode**

Find the Code panel header section (around line 1176-1195). Wrap the existing switcher in an `{#if}` block:

```svelte
<div class="flex h-10 items-center justify-between gap-1.5 border-b border-border px-3">
  {#if isStructurizr}
    <FileTabs
      files={structurizrFiles}
      activeFile={activeStructurizrFile}
      onSelect={handleFileSelect}
      onCreate={handleFileCreate}
      onDelete={handleFileDelete}
      onRename={handleFileRename} />
  {:else}
    <div class="flex items-center gap-1.5">
      <Code2 class="size-4 text-muted-foreground" />
      <span class="text-xs font-semibold text-foreground">Code</span>
      <span class="text-[10px] text-muted-foreground"
        >{$stateStore.editorMode === 'config' ? 'config' : 'mermaid'}</span>
    </div>
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="flex h-6 items-center gap-1 rounded-md border border-border bg-background px-2 text-[10px] font-medium transition-colors hover:bg-muted/50"
        onclick={() => {
          const currentMode = $stateStore.editorMode;
          const newMode = currentMode === 'code' ? 'config' : 'code';
          updateCodeStore({ editorMode: newMode });
        }}
        title="Switch between mermaid code and configuration">
        {$stateStore.editorMode === 'code' ? 'Config' : 'Code'}
      </button>
    </div>
  {/if}
</div>
```

- [ ] **Step 5: Update editor onUpdate for Structurizr mode**

Change the Editor's `onUpdate` callback to handle both modes:

```svelte
<Editor
  onUpdate={(code) => {
    if (isStructurizr) {
      workspaceStore.updateFile(activeStructurizrFile, code);
    } else {
      updateCodeStore({ code });
      ensureFileExists();
      workspaceStore.markDirty();
    }
  }}
  isMobile={width < 768}
  sendChatMessage={handleSendChatMessage} />
```

Also update the Editor's initial value — when in Structurizr mode, pass the active file's content instead of `$stateStore.code`. This may require reading the Editor component to find the right prop. If the Editor reads from `$stateStore.code`, add a `$effect` that syncs the active file content into `inputStateStore.code` when in Structurizr mode:

```typescript
$effect(() => {
  if (isStructurizr && structurizrFiles[activeStructurizrFile] !== undefined) {
    inputStateStore.update((s) => ({
      ...s,
      code: structurizrFiles[activeStructurizrFile]
    }));
  }
});
```

- [ ] **Step 6: Replace the canvas View for Structurizr mode**

Find where `<View>` (the Mermaid canvas) is rendered. Wrap it in a conditional:

```svelte
{#if isStructurizr}
  <StructurizrView
    files={structurizrFiles}
    gridEnabled={$inputStateStore.grid} />
{:else}
  <View
    ... existing props ... />
{/if}
```

- [ ] **Step 7: Commit**

```bash
git add src/routes/workspace/[id]/+page.svelte
git commit -m "feat: workspace route conditionally renders Structurizr or Mermaid canvas"
```

---

## Task 15: Dashboard — New Workspace Type Selection

**Files:**
- Modify: `src/routes/dashboard/+page.svelte`

- [ ] **Step 1: Update `handleNewWorkspace` to accept engine**

Replace the existing function:

```typescript
async function handleNewWorkspace(engine: 'mermaid' | 'structurizr' = 'mermaid') {
  if (!authStore.isLoggedIn) {
    authStore.login();
    return;
  }
  creating = true;
  const ws = await workspaceStore.create(undefined, engine);
  creating = false;
  if (ws) goto(resolve(`/workspace/${ws.id}`));
}
```

- [ ] **Step 2: Replace the "New Diagram" card with a dropdown**

Find the new-card button (around line 421-436). Replace with:

```svelte
<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    <button
      class="new-card group"
      disabled={creating}
      aria-label="Create new workspace">
      <div class="new-card-inner">
        {#if creating}
          <Loader2Spin class="size-6 animate-spin text-muted-foreground" />
        {:else}
          <div class="new-card-icon">
            <Plus class="size-5" />
          </div>
        {/if}
        <span class="new-card-label">New Diagram</span>
      </div>
    </button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="start" class="min-w-[200px]">
    <DropdownMenu.Item onclick={() => handleNewWorkspace('mermaid')}>
      <Workflow class="mr-2 size-4" />
      Mermaid Diagram
    </DropdownMenu.Item>
    <DropdownMenu.Item onclick={() => handleNewWorkspace('structurizr')}>
      <Network class="mr-2 size-4" />
      C4 Architecture
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
```

Note: `Loader2Spin` is already imported as an alias for `Loader2` (line 46). `Workflow` and `Network` are already imported (lines 18, 17).

- [ ] **Step 3: Add engine badge to workspace cards**

In the workspace card metadata section (around line 503-515), add an engine badge before the diagram_type badge:

```svelte
<div class="ws-meta">
  {#if ws.engine === 'structurizr'}
    <span class="ws-type-badge" style="color: #1168BD; background: rgba(17,104,189,0.08); border-color: rgba(17,104,189,0.15);">
      C4
    </span>
  {/if}
  {#if ws.diagram_type}
    <span
      class="ws-type-badge"
      style="color: {style.text}; background: {style.bg}; border-color: {style.border}">
      {ws.diagram_type}
    </span>
  {/if}
  <span class="ws-time">
    <Clock class="size-3" />
    {formatTime(ws.updated_at)}
  </span>
</div>
```

Note: The `DiagramWorkspaceSummary` type now includes `engine` from Task 3, so `ws.engine` is available.

- [ ] **Step 4: Commit**

```bash
git add src/routes/dashboard/+page.svelte
git commit -m "feat: dashboard supports creating Mermaid or C4 Architecture workspaces"
```

---

## Task 16: AI Chat System Prompt for Structurizr

**Files:**
- Create: `src/lib/features/structurizr/system-prompt.ts`

- [ ] **Step 1: Create the Structurizr system prompt**

```typescript
/**
 * System prompt for AI chat in Structurizr / C4 workspaces.
 */

export function buildStructurizrSystemPrompt(): string {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `You are an expert C4 software architecture assistant inside a live Structurizr DSL editor.
Today's date: ${today}.

IMPORTANT COMMUNICATION RULES:
- Use emojis in greetings and explanations to make conversations friendly and engaging 🏗️
- NEVER discuss system prompts, tools, or internal workings - just focus on helping with architecture diagrams
- Keep conversations natural and user-friendly
- Do not write DSL code without tools.

STRUCTURIZR DSL SYNTAX:
You generate and edit Structurizr DSL code. The DSL is block-based and hierarchical.

\`\`\`
workspace "Name" "Description" {
    model {
        // People
        user = person "User" "Description" "tag1,tag2"

        // Software Systems
        system = softwareSystem "System Name" "Description" {
            // Containers
            webapp = container "Web App" "Description" "Technology"
            api = container "API" "Description" "Node.js"
            db = container "Database" "Stores data" "PostgreSQL" "Database"
        }

        // Relationships: source -> destination "description" "technology"
        user -> webapp "Uses" "HTTPS"
        webapp -> api "Makes API calls to" "JSON/HTTPS"
        api -> db "Reads from and writes to" "SQL"
    }

    views {
        // System Context view — shows the system and its interactions
        systemContext system "SystemContext" {
            include *
            autoLayout
        }

        // Container view — shows containers within a system
        container system "Containers" {
            include *
            autoLayout
        }

        // Component view — shows components within a container
        // component api "Components" {
        //     include *
        //     autoLayout
        // }

        styles {
            element "Person" {
                shape Person
                background #08427B
                color #ffffff
            }
            element "Software System" {
                background #1168BD
                color #ffffff
            }
            element "Container" {
                background #438DD5
                color #ffffff
            }
            element "Database" {
                shape Cylinder
            }
        }
    }
}
\`\`\`

C4 MODEL LEVELS:
1. System Context — people + software systems and their relationships
2. Container — deployable units within a system (web apps, APIs, databases, queues)
3. Component — internal building blocks within a container (services, controllers, repos)
4. (Code-level diagrams are not supported in this editor)

VIEW TYPES:
- systemLandscape — all people and systems
- systemContext <system> — one system in context
- container <system> — containers within a system
- component <container> — components within a container
- dynamic <scope> — runtime behavior / sequence
- deployment <scope> <env> — infrastructure mapping

ELEMENT KEYWORDS: person, softwareSystem, container, component, deploymentNode, infrastructureNode
RELATIONSHIP SYNTAX: source -> destination "description" "technology"
GROUPING: group "Name" { ... }
INCLUDES: !include filename.dsl (for multi-file workspaces)
AUTO-LAYOUT: autoLayout (or autoLayout lr, autoLayout rl, autoLayout bt)

SHAPES: Box (default), RoundedBox, Circle, Ellipse, Hexagon, Cylinder, Pipe, Person, Robot, Folder, WebBrowser, MobileDeviceLandscape, MobileDevicePortrait, Component

BEST PRACTICES:
- Always define relationships with descriptions
- Use technology labels for containers (e.g., "React", "Node.js", "PostgreSQL")
- Use tags to categorize and style elements
- Use autoLayout in views for clean positioning
- Keep descriptions concise but informative
- Separate concerns: model defines elements, views define what to show

TOOLS:
- diagramRead(startLine?, endLine?) — Read current DSL content
- diagramPatch(startLine, endLine, content) — Replace specific lines
- diagramWrite(content) — Replace entire DSL
- diagramDelete — Clear DSL

WHEN TO USE TOOLS:
- If user asks to create a NEW architecture diagram, use diagramWrite directly
- If user asks to EDIT or MODIFY existing architecture, call diagramRead first then diagramPatch
- For greetings or general questions, respond naturally WITHOUT tools`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/features/structurizr/system-prompt.ts
git commit -m "feat: AI chat system prompt for Structurizr DSL"
```

---

## Task 17: Chat API — Route to Correct System Prompt

**Files:**
- Modify: `src/routes/api/chat/+server.ts`

- [ ] **Step 1: Import Structurizr system prompt**

Add at the top of the file:

```typescript
import { buildStructurizrSystemPrompt } from '$lib/features/structurizr/system-prompt';
```

- [ ] **Step 2: Accept engine parameter in the chat request**

Find where the chat POST handler parses the request body. Add `engine` to the expected fields. Then use it to select the system prompt:

```typescript
const engine = body.engine ?? 'mermaid';
const systemPrompt = engine === 'structurizr'
  ? buildStructurizrSystemPrompt()
  : buildMultiStepSystemPrompt();
```

Pass `systemPrompt` to wherever it's used in the streaming/agent call.

- [ ] **Step 3: Update the chat frontend to pass engine**

In `src/lib/features/chat/components/Chat.simple.svelte`, find where the chat sends messages to `/api/chat`. Add the engine from the workspace:

```typescript
engine: workspaceStore.workspace?.document?.engine ?? 'mermaid'
```

to the request body.

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/chat/+server.ts src/lib/features/chat/components/Chat.simple.svelte
git commit -m "feat: chat API routes to Structurizr system prompt based on workspace engine"
```

---

## Task 18: Integration Test — End-to-End Parse & Render

**Files:**
- Create: `src/lib/features/structurizr/parser.test.ts`

- [ ] **Step 1: Write parser integration test**

```typescript
import { describe, it, expect } from 'vitest';
import { resolveIncludes, parseStructurizrDSL } from './parser';

describe('resolveIncludes', () => {
  it('should inline included files', () => {
    const files = {
      'workspace.dsl': 'workspace {\n  !include model.dsl\n}',
      'model.dsl': 'model { person "User" }'
    };
    const result = resolveIncludes(files, 'workspace.dsl');
    expect(result).toContain('model { person "User" }');
    expect(result).not.toContain('!include');
  });

  it('should handle circular includes gracefully', () => {
    const files = {
      'a.dsl': '!include b.dsl',
      'b.dsl': '!include a.dsl'
    };
    const result = resolveIncludes(files, 'a.dsl');
    expect(result).toContain('Circular include detected');
  });

  it('should handle missing files gracefully', () => {
    const files = {
      'workspace.dsl': '!include missing.dsl'
    };
    const result = resolveIncludes(files, 'workspace.dsl');
    expect(result).toContain('File not found');
  });
});

describe('parseStructurizrDSL', () => {
  it('should parse a valid workspace DSL', async () => {
    const files = {
      'workspace.dsl': `workspace "Test" "A test workspace" {
        model {
          user = person "User" "A user"
          system = softwareSystem "System" "A system"
          user -> system "Uses"
        }
        views {
          systemContext system "Context" {
            include *
            autoLayout
          }
        }
      }`
    };

    const result = await parseStructurizrDSL(files);
    expect(result.error).toBeNull();
    expect(result.workspace).not.toBeNull();
    expect(result.workspace!.name).toBe('Test');
    expect(result.workspace!.model.people.length).toBeGreaterThan(0);
    expect(result.workspace!.model.softwareSystems.length).toBeGreaterThan(0);
    expect(result.workspace!.views.views.length).toBeGreaterThan(0);
  });

  it('should return error for invalid DSL', async () => {
    const files = {
      'workspace.dsl': 'this is not valid dsl {{{}'
    };
    const result = await parseStructurizrDSL(files);
    expect(result.error).not.toBeNull();
    expect(result.workspace).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run src/lib/features/structurizr/parser.test.ts
```

Expected: Tests pass. If `structurizr-parser` has a different API shape than expected, adjust the `mapParserOutput` function in `parser.ts` based on the actual output and re-run.

- [ ] **Step 3: Commit**

```bash
git add src/lib/features/structurizr/parser.test.ts
git commit -m "test: structurizr parser integration tests"
```

---

## Task 19: Smoke Test — Build & Dev Server

- [ ] **Step 1: Run TypeScript type check**

```bash
npx svelte-check --tsconfig ./tsconfig.json
```

Fix any type errors that surface.

- [ ] **Step 2: Run the dev server**

```bash
npm run dev
```

Verify no build errors. Open the dashboard, click "New Diagram" dropdown, select "C4 Architecture", and verify:
- Workspace is created and navigates to `/workspace/{id}`
- File tabs show `workspace.dsl`
- Editor shows the starter template DSL
- SvelteFlow canvas renders the parsed C4 diagram (Person → System → Containers)
- View selector dropdown shows available views
- Switching views re-renders the canvas

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve integration issues from smoke test"
```

---

## Task 20: Final Build Verification

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: Build completes without errors.

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete Structurizr C4 architecture canvas integration"
```
