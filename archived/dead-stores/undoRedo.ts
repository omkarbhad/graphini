import { derived, writable } from 'svelte/store';

export interface HistoryState {
  past: string[];
  present: string;
  future: string[];
}

interface UndoRedoState {
  history: HistoryState;
  canUndo: boolean;
  canRedo: boolean;
}

function createUndoRedoStore(initialContent: string = '') {
  const { subscribe, set, update } = writable<UndoRedoState>({
    history: {
      past: [],
      present: initialContent,
      future: []
    },
    canUndo: false,
    canRedo: false
  });

  return {
    subscribe,

    // Add new state to history
    pushState: (newContent: string) => {
      update((state) => {
        const newHistory = {
          past: [...state.history.past, state.history.present],
          present: newContent,
          future: []
        };

        // Limit history size to prevent memory issues
        if (newHistory.past.length > 50) {
          newHistory.past = newHistory.past.slice(-50);
        }

        return {
          ...state,
          history: newHistory,
          canUndo: newHistory.past.length > 0,
          canRedo: false
        };
      });
    },

    // Undo last action
    undo: () => {
      update((state) => {
        if (state.history.past.length === 0) return state;

        const previous = state.history.past[state.history.past.length - 1];
        const newPast = state.history.past.slice(0, state.history.past.length - 1);

        return {
          ...state,
          history: {
            past: newPast,
            present: previous,
            future: [state.history.present, ...state.history.future]
          },
          canUndo: newPast.length > 0,
          canRedo: true
        };
      });
    },

    // Redo next action
    redo: () => {
      update((state) => {
        if (state.history.future.length === 0) return state;

        const next = state.history.future[0];
        const newFuture = state.history.future.slice(1);

        return {
          ...state,
          history: {
            past: [...state.history.past, state.history.present],
            present: next,
            future: newFuture
          },
          canUndo: true,
          canRedo: newFuture.length > 0
        };
      });
    },

    // Reset history with new content
    reset: (content: string) => {
      set({
        history: {
          past: [],
          present: content,
          future: []
        },
        canUndo: false,
        canRedo: false
      });
    },

    // Get current content
    getCurrentContent: () => {
      let content = '';
      subscribe((state) => {
        content = state.history.present;
      })();
      return content;
    },

    // Check if content has changed from initial state
    hasChanges: (initialContent: string) => {
      let current = '';
      subscribe((state) => {
        current = state.history.present;
      })();
      return current !== initialContent;
    }
  };
}

export const undoRedoStore = createUndoRedoStore();

// Derived stores
export const canUndo = derived(undoRedoStore, (state) => state.canUndo);
export const canRedo = derived(undoRedoStore, (state) => state.canRedo);
export const currentContent = derived(undoRedoStore, (state) => state.history.present);
