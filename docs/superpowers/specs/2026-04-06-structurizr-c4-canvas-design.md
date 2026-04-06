# Structurizr C4 Architecture Canvas — Design Spec

**Date:** 2026-04-06
**Status:** Approved

## Overview

Add a full C4 architecture diagram editor to Graphini alongside the existing Mermaid editor. Users write Structurizr DSL code, which is parsed and rendered on a SvelteFlow canvas with custom C4 node components. Same shell (editor + canvas + chat), completely different rendering internals.

## Key Decisions

- **Workspace engine type** — chosen at creation time (`mermaid` or `structurizr`), immutable after
- **Approach** — Full DSL parser + SvelteFlow renderer (not a visual builder, not a Mermaid bridge)
- **Rendering** — SvelteFlow (`@xyflow/svelte`) with Dagre layout, custom C4 node components
- **Parser** — `structurizr-parser` npm package (beta v0.4.0, MIT) wrapped in our own module
- **Multi-file editing** — DSL files shown as tabs in the existing editor switcher (not a new sidebar)

## C4 Model & Supported Diagram Types

C4 is four levels of abstraction for software architecture:

1. **System Context** — system in scope + users + external systems
2. **Container** — deployable units within a system (web apps, APIs, databases)
3. **Component** — internal building blocks of a container
4. **Code** — class-level detail (not in scope for v1)

Additional view types:

- **System Landscape** — all people and systems in the enterprise
- **Dynamic** — runtime behavior and sequencing
- **Deployment** — maps containers to infrastructure nodes
- **Filtered** — subsets of other views based on tags

## Data Model

### WorkspaceDocument changes

```typescript
export interface WorkspaceDocument {
  version: number;
  /** Rendering engine — determines which editor/canvas pipeline to use */
  engine: 'mermaid' | 'structurizr';

  // Existing Mermaid fields (unchanged)
  canvas: { ... };
  mermaidCode: string;
  chat: { ... };
  documentMarkdown: string;

  // New Structurizr fields
  /** Multi-file DSL storage — filename → content */
  files: Record<string, string>;
}
```

Default for new Structurizr workspace:
```typescript
{
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
  // ... other defaults
}
```

### DiagramWorkspace (database row) changes

- Add `engine TEXT DEFAULT 'mermaid'` column to `diagram_workspaces` table
- `diagram_type` field gets new values: `'c4-system-context'`, `'c4-container'`, `'c4-component'`, `'c4-deployment'`, `'c4-dynamic'`, `'c4-landscape'`

### API changes

- `POST /api/workspaces` — accept optional `engine: 'mermaid' | 'structurizr'` in body
- `POST /api/chat` — check workspace engine to load appropriate system prompt

## Rendering Pipeline

```
Files map → Resolve !includes → Concatenated DSL
  → structurizr-parser → JSON Workspace
  → Extract active view → Filter model elements
  → Dagre layout → SvelteFlow nodes + edges
  → Canvas render
```

### Steps

1. **Resolve includes** — `resolveIncludes(files, 'workspace.dsl')` walks `!include` directives, inlines referenced file contents from the files map
2. **Parse** — `structurizr-parser` produces a JSON workspace object containing `model` (people, systems, containers, components, relationships) and `views` (view definitions + styles)
3. **View selection** — User picks a view from toolbar dropdown. The selected view defines which model elements and relationships to display
4. **Transform** — Map C4 elements to SvelteFlow nodes with custom node types, relationships become labeled edges
5. **Auto-layout** — Dagre positions nodes, respecting `autoLayout` direction from DSL (TB, BT, LR, RL)
6. **Render** — SvelteFlow renders the graph

### Re-render triggers

- File content changes (debounced)
- View selection changes
- Theme toggle (dark/light)

### Manual position overrides

- If a user drags a node, store the position override in workspace state
- On next DSL change, re-layout only new/changed nodes, preserve manually positioned ones

## UI Layout

### Structurizr workspace layout

```
┌──────────────────────────┬──────────────────────┐
│ [workspace.dsl] [+]      │  [View: Containers v] │
├──────────────────────────┤                       │
│                          │   SvelteFlow Canvas   │
│   Monaco Editor          │                       │
│   (Structurizr DSL)      │   ┌──────┐            │
│                          │   │Person│──→ ┌─────┐ │
│                          │   └──────┘    │System│ │
│                          │               └─────┘ │
├──────────────────────────┤                       │
│   Chat Panel             │                       │
└──────────────────────────┴──────────────────────┘
```

### Editor tab switcher (Structurizr mode)

- Tabs = DSL filenames: `workspace.dsl | model.dsl | styles.dsl | +`
- `+` button creates a new file (prompts for filename)
- Right-click tab → Rename / Delete
- Active tab shown in editor
- Default: just `workspace.dsl`

### Editor tab switcher (Mermaid mode — unchanged)

- Tabs = `Code | Config`

### Canvas toolbar (Structurizr mode)

- **View selector dropdown** — lists all views defined in the DSL
- **Auto-layout button** — re-run Dagre
- **Zoom controls** — in/out/reset (SvelteFlow built-in)
- **Grid toggle**
- **Theme toggle** (dark/light)
- No shape drawing tools (elements come from code)

### Dashboard changes

- "New Workspace" button becomes dropdown: "New Mermaid Diagram" / "New C4 Architecture"
- Workspace cards show engine badge (small "C4" or "Mermaid" tag)

## Custom C4 Node Components

Each registered as a SvelteFlow custom node type:

| Node Type | Visual | Default Color |
|---|---|---|
| **PersonNode** | Stick figure silhouette + name + description | Dark blue `#08427B` |
| **SoftwareSystemNode** | Large rounded rect + name + description + `[Software System]` | Blue `#1168BD` |
| **ContainerNode** | Rounded rect + name + description + technology + `[Container]` | Medium blue `#438DD5` |
| **ComponentNode** | Rounded rect + name + description + technology + `[Component]` | Light blue `#85BBF0` |
| **DeploymentNode** | Dashed border rectangle that nests child nodes | Gray `#999999` |

- DSL `styles` block overrides defaults (background, color, shape, border)
- Relationships rendered as labeled edges with technology annotations
- Tags from DSL map to visual style overrides

## AI Chat Integration

### Structurizr system prompt

- Teaches the LLM Structurizr DSL syntax: workspace, model, views, styles blocks
- C4 model concepts: people, software systems, containers, components, relationships
- Element types, relationship syntax, view definitions
- Examples of well-structured C4 models

### Chat flow

1. User sends message
2. `/api/chat` checks `workspace.engine`
3. Loads `structurizr-system-prompt.ts` instead of Mermaid prompt
4. LLM generates/modifies Structurizr DSL
5. Response specifies which file the code belongs to
6. Code injected into appropriate file in the files map
7. Triggers re-parse → re-render

## File Structure

### New files

```
src/lib/features/structurizr/
├── parser.ts                         — Wraps structurizr-parser, resolves !includes
├── transformer.ts                    — JSON workspace → SvelteFlow nodes/edges
├── layout.ts                         — Dagre auto-layout logic
├── types.ts                          — C4 element types, parsed workspace interfaces
├── system-prompt.ts                  — AI chat system prompt for Structurizr DSL
└── components/
    ├── StructurizrView.svelte        — SvelteFlow canvas
    ├── ViewSelector.svelte           — Toolbar dropdown for C4 views
    ├── FileTabs.svelte               — Tab switcher for DSL files
    └── nodes/
        ├── PersonNode.svelte
        ├── SoftwareSystemNode.svelte
        ├── ContainerNode.svelte
        ├── ComponentNode.svelte
        └── DeploymentNode.svelte
```

### Modified files

| File | Change |
|---|---|
| `src/lib/types/workspace.ts` | Add `engine`, `files` fields to WorkspaceDocument |
| `src/routes/workspace/[id]/+page.svelte` | Conditionally render StructurizrView vs View based on engine |
| `src/routes/api/workspaces/+server.ts` | Accept `engine` in create schema |
| `src/routes/api/chat/+server.ts` | Load Structurizr system prompt when engine matches |
| `src/routes/dashboard/+page.svelte` | New workspace dropdown (Mermaid / C4 Architecture) |
| `src/lib/stores/workspace.svelte.ts` | Handle files map, active file, view selection state |
| `database/schema.sql` | Add `engine` column to `diagram_workspaces` |

### Untouched Mermaid files

No changes to: `mermaid-renderer.ts`, `diagramMapper.ts`, `panZoom.ts`, `View.svelte`, `state.ts`

## Export

- **SVG** — via SvelteFlow built-in export
- **PNG** — canvas conversion (same pattern as Mermaid)
- **DSL** — download all files as-is (or zipped if multiple)

## Dependencies

| Package | Purpose | License |
|---|---|---|
| `@xyflow/svelte` | SvelteFlow canvas | MIT |
| `structurizr-parser` | DSL → JSON workspace | MIT |
| `dagre` | Auto-layout | MIT |

## Out of Scope (v1)

- Code-level diagrams (class/interface detail)
- Visual drag-and-drop element creation (elements come from code only)
- Collaborative real-time editing
- Structurizr DSL `!docs` and `!adrs` directives
- Structurizr DSL `!script` directive (Groovy/JS scripting)
- Custom view types and image views
- Importing from Structurizr cloud/on-prem workspaces
