/**
 * Workspace Types
 * A DiagramWorkspace is a single "project file" stored as JSONB in the database.
 * It contains all canvas, diagram, chat, and document state in one document.
 */

/** Canvas viewport position */
interface CanvasViewport { x: number; y: number; zoom: number; }

/** Canvas element placeholder — workspace documents can store element data */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CanvasElement = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CanvasConnection = Record<string, any>;

// ── Workspace Document (the JSONB blob) ────────────────────────────────────

export interface WorkspaceDocument {
  /** Schema version for future migrations */
  version: number;

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

  /** Chat messages stored inline */
  chat: {
    messages: WorkspaceChatMessage[];
    /** Optional link to conversations table for credit tracking */
    conversationId?: string;
  };

  /** Document panel markdown */
  documentMarkdown: string;
}

export interface WorkspaceChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model_used?: string;
}

// ── Database Row Types ─────────────────────────────────────────────────────

/** Full row from diagram_workspaces table */
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
  diagram_type: string | null;
  created_at: string;
  updated_at: string;
}

/** Lightweight version for dashboard listing (excludes document blob) */
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
  diagram_type: string | null;
  created_at: string;
  updated_at: string;
}

// ── Defaults ───────────────────────────────────────────────────────────────

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
  mermaidCode: '',
  version: 1
};
