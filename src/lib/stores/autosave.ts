import { inputStateStore } from '$lib/util/state';
import { derived, get, writable } from 'svelte/store';
import { fileSystemStore, type UserFile } from './fileSystem';

interface AutosaveState {
  isEnabled: boolean;
  lastSaved: string | null;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  autoSaveInterval: number;
  pendingChanges: boolean;
}

function createAutosaveStore() {
  const { subscribe, set, update } = writable<AutosaveState>({
    isEnabled: true,
    lastSaved: null,
    isSaving: false,
    saveStatus: 'idle',
    autoSaveInterval: 2000, // 2 seconds
    pendingChanges: false
  });

  let autosaveTimer: NodeJS.Timeout | null = null;
  let currentFileId: string | null = null;
  let initialContent: string = '';

  // Start autosave timer
  function startAutosaveTimer() {
    if (autosaveTimer) {
      clearInterval(autosaveTimer);
    }

    autosaveTimer = setInterval(async () => {
      const state = getCurrentState();
      if (state.isEnabled && state.pendingChanges && currentFileId && !state.isSaving) {
        await performAutosave();
      }
    }, getCurrentState().autoSaveInterval);
  }

  // Stop autosave timer
  function stopAutosaveTimer() {
    if (autosaveTimer) {
      clearInterval(autosaveTimer);
      autosaveTimer = null;
    }
  }

  // Get current state
  function getCurrentState(): AutosaveState {
    let state: AutosaveState;
    subscribe((s) => {
      state = s;
    })();
    return state!;
  }

  // Perform autosave
  async function performAutosave(): Promise<void> {
    if (!currentFileId) return;

    update((state) => ({ ...state, isSaving: true, saveStatus: 'saving' }));

    try {
      const state = get(inputStateStore);
      const content = state.code || '';
      await fileSystemStore.updateFile(currentFileId, content);

      // Also force immediate DB sync so "All synced" is accurate
      fileSystemStore.forceSyncToDb().catch(() => {});

      update((state) => ({
        ...state,
        isSaving: false,
        saveStatus: 'saved',
        lastSaved: new Date().toISOString(),
        pendingChanges: false
      }));

      // Reset status after 2 seconds
      setTimeout(() => {
        update((state) => ({ ...state, saveStatus: 'idle' }));
      }, 2000);
    } catch (error) {
      console.error('Autosave failed:', error);
      update((state) => ({
        ...state,
        isSaving: false,
        saveStatus: 'error'
      }));

      // Reset error status after 3 seconds
      setTimeout(() => {
        update((state) => ({ ...state, saveStatus: 'idle' }));
      }, 3000);
    }
  }

  return {
    subscribe,

    // Enable/disable autosave
    setEnabled: (enabled: boolean) => {
      update((state) => ({ ...state, isEnabled: enabled }));
      if (enabled) {
        startAutosaveTimer();
      } else {
        stopAutosaveTimer();
      }
    },

    // Set current file for autosave
    setCurrentFile: (file: UserFile | null) => {
      currentFileId = file?.id || null;
      initialContent = file?.content || '';

      update((state) => ({
        ...state,
        pendingChanges: false,
        lastSaved: file?.updatedAt || null
      }));
    },

    // Mark content as changed (triggers autosave)
    markChanged: () => {
      update((state) => ({ ...state, pendingChanges: true }));
    },

    // Force immediate save
    saveNow: async () => {
      if (currentFileId && getCurrentState().pendingChanges) {
        await performAutosave();
      }
    },

    // Set autosave interval
    setInterval: (interval: number) => {
      update((state) => ({ ...state, autoSaveInterval: interval }));
      startAutosaveTimer(); // Restart with new interval
    },

    // Check if there are unsaved changes
    hasUnsavedChanges: () => {
      const state = getCurrentState();
      return state.pendingChanges;
    },

    // Reset autosave state
    reset: () => {
      stopAutosaveTimer();
      currentFileId = null;
      initialContent = '';
      set({
        isEnabled: true,
        lastSaved: null,
        isSaving: false,
        saveStatus: 'idle',
        autoSaveInterval: 2000,
        pendingChanges: false
      });
    },

    // Initialize autosave
    init: () => {
      startAutosaveTimer();
    }
  };
}

export const autosaveStore = createAutosaveStore();

// Derived stores
export const isAutosaving = derived(autosaveStore, (state) => state.isSaving);
export const autosaveStatus = derived(autosaveStore, (state) => state.saveStatus);
export const lastSaved = derived(autosaveStore, (state) => state.lastSaved);
export const hasUnsavedChanges = derived(autosaveStore, (state) => state.pendingChanges);
