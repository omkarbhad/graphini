/**
 * Diagram History Store - Undo/Redo + Checkpoints
 * Tracks diagram code changes for undo/redo and named checkpoints
 */

interface HistoryEntry {
  code: string;
  timestamp: number;
  source: 'user' | 'ai' | 'checkpoint';
  label?: string;
}

interface Checkpoint {
  id: string;
  name: string;
  code: string;
  timestamp: number;
}

interface DiagramHistoryState {
  history: HistoryEntry[];
  currentIndex: number;
  checkpoints: Checkpoint[];
  maxHistory: number;
}

let state = $state<DiagramHistoryState>({
  history: [],
  currentIndex: -1,
  checkpoints: [],
  maxHistory: 1000
});

function pushState(code: string, source: 'user' | 'ai' = 'user', label?: string): void {
  if (!code) return;

  // Don't push if same as current
  if (state.currentIndex >= 0 && state.history[state.currentIndex]?.code === code) return;

  // Truncate any forward history (redo stack)
  if (state.currentIndex < state.history.length - 1) {
    state.history = state.history.slice(0, state.currentIndex + 1);
  }

  // Push new entry
  state.history = [...state.history, { code, timestamp: Date.now(), source, label }];

  // Trim if over max
  if (state.history.length > state.maxHistory) {
    state.history = state.history.slice(state.history.length - state.maxHistory);
  }

  state.currentIndex = state.history.length - 1;
}

function undo(): string | null {
  if (state.currentIndex <= 0) return null;
  state.currentIndex--;
  return state.history[state.currentIndex].code;
}

function redo(): string | null {
  if (state.currentIndex >= state.history.length - 1) return null;
  state.currentIndex++;
  return state.history[state.currentIndex].code;
}

function createCheckpoint(name: string): Checkpoint | null {
  if (state.currentIndex < 0) return null;
  const current = state.history[state.currentIndex];
  if (!current) return null;

  const checkpoint: Checkpoint = {
    id: `cp-${Date.now()}`,
    name,
    code: current.code,
    timestamp: Date.now()
  };

  state.checkpoints = [...state.checkpoints, checkpoint];
  return checkpoint;
}

function restoreCheckpoint(id: string): string | null {
  const cp = state.checkpoints.find((c) => c.id === id);
  if (!cp) return null;
  pushState(cp.code, 'user', `Restored: ${cp.name}`);
  return cp.code;
}

function deleteCheckpoint(id: string): void {
  state.checkpoints = state.checkpoints.filter((c) => c.id !== id);
}

function clear(): void {
  state.history = [];
  state.currentIndex = -1;
}

export const diagramHistory = {
  get state() {
    return state;
  },
  get canUndo() {
    return state.currentIndex > 0;
  },
  get canRedo() {
    return state.currentIndex < state.history.length - 1;
  },
  get currentCode() {
    return state.currentIndex >= 0 ? state.history[state.currentIndex]?.code : null;
  },
  get checkpoints() {
    return state.checkpoints;
  },
  get historyLength() {
    return state.history.length;
  },
  get currentIndex() {
    return state.currentIndex;
  },
  push: pushState,
  undo,
  redo,
  createCheckpoint,
  restoreCheckpoint,
  deleteCheckpoint,
  clear
};
