/**
 * Workspace Store
 * Manages the current diagram workspace — loading, saving, and auto-save.
 * Coordinates state between canvas, code editor, chat, and document stores.
 */

import type {
  DiagramWorkspace,
  DiagramWorkspaceSummary,
  WorkspaceDocument
} from '$lib/types/workspace';
import { DEFAULT_WORKSPACE_DOCUMENT } from '$lib/types/workspace';
import { documentMarkdownStore } from '$lib/stores/documentStore.svelte';
import { get } from 'svelte/store';
import { inputStateStore } from '$lib/util/state/state';
import { hmrRestore, hmrPreserve } from '$lib/util/hmr';

// ── State ──────────────────────────────────────────────────────────────────

interface WorkspaceState {
  workspace: DiagramWorkspace | null;
  loading: boolean;
  saving: boolean;
  lastSavedAt: number | null;
  dirty: boolean;
  error: string | null;
}

const state = $state<WorkspaceState>(
  hmrRestore('workspaceState') ?? {
    dirty: false,
    error: null,
    lastSavedAt: null,
    loading: false,
    saving: false,
    workspace: null
  }
);
hmrPreserve('workspaceState', () => ({ ...state }));

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 5000;

// ── Helpers ────────────────────────────────────────────────────────────────

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
    mermaidCode: engine === 'mermaid' ? mermaidState?.code || '' : '',
    version: 1
  };
}

function detectDiagramType(code: string): string | null {
  if (!code) return null;
  const first = code
    .trim()
    .split(/[\s\n]/)[0]
    ?.toLowerCase();
  const types: Record<string, string> = {
    class: 'class',
    classDiagram: 'class',
    erdiagram: 'erd',
    flowchart: 'flowchart',
    gantt: 'gantt',
    gitgraph: 'gitgraph',
    graph: 'flowchart',
    mindmap: 'mindmap',
    pie: 'pie',
    sequence: 'sequence',
    sequencediagram: 'sequence',
    state: 'state',
    statediagram: 'state',
    timeline: 'timeline'
  };
  return types[first || ''] || null;
}

// ── Core Methods ───────────────────────────────────────────────────────────

async function load(id: string): Promise<boolean> {
  state.loading = true;
  state.error = null;

  try {
    const res = await fetch(`/api/workspaces/${id}`, { credentials: 'include' });
    if (!res.ok) {
      state.error = res.status === 404 ? 'Workspace not found' : 'Failed to load workspace';
      state.loading = false;
      return false;
    }

    const workspace: DiagramWorkspace = await res.json();
    state.workspace = workspace;
    state.dirty = false;
    state.lastSavedAt = Date.now();

    // Hydrate sub-stores
    const doc = workspace.document || DEFAULT_WORKSPACE_DOCUMENT;

    // Canvas store removed — canvas state lives in workspace.document only
    documentMarkdownStore.set(doc.documentMarkdown || '');

    if (doc.mermaidCode) {
      inputStateStore.update((s) => ({ ...s, code: doc.mermaidCode }));
    }

    state.loading = false;
    return true;
  } catch {
    state.error = 'Failed to load workspace';
    state.loading = false;
    return false;
  }
}

async function save(): Promise<boolean> {
  if (!state.workspace) return false;
  if (state.saving) return false;

  state.saving = true;
  try {
    const document = collectDocument();
    const elementCount = document.canvas.elements.length;
    const diagramType = detectDiagramType(document.mermaidCode);

    const res = await fetch(`/api/workspaces/${state.workspace.id}/document`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ document, element_count: elementCount, diagram_type: diagramType })
    });

    if (res.ok) {
      state.dirty = false;
      state.lastSavedAt = Date.now();
      // Update local workspace copy
      state.workspace = {
        ...state.workspace,
        diagram_type: diagramType,
        document,
        element_count: elementCount,
        updated_at: new Date().toISOString()
      };
      state.saving = false;
      return true;
    }

    state.saving = false;
    return false;
  } catch {
    state.saving = false;
    return false;
  }
}

function markDirty() {
  if (!state.workspace) return;
  state.dirty = true;
  debouncedSave();
}

function debouncedSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => save(), SAVE_DEBOUNCE_MS);
}

function addChatMessage(message: {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_used?: string;
}) {
  if (!state.workspace?.document) return;

  const chatMessages = [...(state.workspace.document.chat?.messages || [])];
  chatMessages.push({
    ...message,
    timestamp: new Date().toISOString()
  });

  state.workspace = {
    ...state.workspace,
    document: {
      ...state.workspace.document,
      chat: {
        ...state.workspace.document.chat,
        messages: chatMessages
      }
    }
  };
  markDirty();
}

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
  const files = { ...state.workspace.document.files };
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete files[filename];
  state.workspace = {
    ...state.workspace,
    document: {
      ...state.workspace.document,
      files
    }
  };
  markDirty();
}

function renameFile(oldName: string, newName: string) {
  if (!state.workspace?.document) return;
  const files = { ...state.workspace.document.files };
  if (!(oldName in files)) return;
  files[newName] = files[oldName];
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
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

async function updateMeta(
  updates: Partial<Pick<DiagramWorkspace, 'title' | 'description' | 'is_starred' | 'tags'>>
): Promise<boolean> {
  if (!state.workspace) return false;

  try {
    const res = await fetch(`/api/workspaces/${state.workspace.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates)
    });

    if (res.ok) {
      const updated = await res.json();
      state.workspace = { ...state.workspace, ...updated };
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function unload() {
  // Flush pending save
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (state.dirty && state.workspace) {
    // Best-effort save via sendBeacon
    const document = collectDocument();
    const payload = JSON.stringify({
      document,
      element_count: document.canvas.elements.length,
      diagram_type: detectDiagramType(document.mermaidCode)
    });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(
        `/api/workspaces/${state.workspace.id}/document`,
        new Blob([payload], { type: 'application/json' })
      );
    }
  }
  state.workspace = null;
  state.dirty = false;
  state.error = null;
}

// ── Dashboard Helpers ──────────────────────────────────────────────────────

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

async function deleteWorkspace(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/workspaces/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function duplicateWorkspace(id: string, title?: string): Promise<DiagramWorkspace | null> {
  try {
    const res = await fetch(`/api/workspaces/${id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title })
    });
    if (res.ok) return res.json();
    return null;
  } catch {
    return null;
  }
}

async function toggleStar(id: string, starred: boolean): Promise<boolean> {
  try {
    const res = await fetch(`/api/workspaces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ is_starred: starred })
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function listWorkspaces(options?: {
  limit?: number;
  offset?: number;
  starred?: boolean;
  search?: string;
}): Promise<{ workspaces: DiagramWorkspaceSummary[]; total: number }> {
  try {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- not reactive, just building a URL
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    if (options?.starred) params.set('starred', 'true');
    if (options?.search) params.set('search', options.search);

    const res = await fetch(`/api/workspaces?${params}`, { credentials: 'include' });
    if (res.ok) return res.json();
    return { workspaces: [], total: 0 };
  } catch {
    return { workspaces: [], total: 0 };
  }
}

// ── Exported Store ─────────────────────────────────────────────────────────

export const workspaceStore = {
  addChatMessage,

  // Dashboard operations
  create: createWorkspace,
  delete: deleteWorkspace,
  deleteFile,
  duplicate: duplicateWorkspace,
  get isActive() {
    return !!state.workspace;
  },
  get isDirty() {
    return state.dirty;
  },

  get isLoading() {
    return state.loading;
  },
  get isSaving() {
    return state.saving;
  },
  list: listWorkspaces,
  load,
  markDirty,
  renameFile,
  save,
  get state() {
    return state;
  },
  toggleStar,
  unload,
  updateFile,
  updateMeta,
  get workspace() {
    return state.workspace;
  }
};
