/**
 * Autosave Manager (Workspace-based)
 * Delegates to workspaceStore for persistence.
 * Kept as a thin wrapper for backward compatibility.
 */

import { workspaceStore } from './workspace.svelte';

class AutosaveManager {
  // Public $state properties
  pendingChanges = $state(false);
  isSaving = $state(false);
  saveStatus: 'idle' | 'saving' | 'saved' | 'error' = $state('idle');
  lastSaved: string | null = $state(null);
  errorMessage: string | null = $state(null);
  isEnabled = $state(true);

  /** Start — no-op, workspace store handles auto-save internally. */
  init(): void {
    // Workspace store manages its own debounced save
  }

  /** No-op — workspace store tracks current workspace. */
  setCurrentFile(_file: unknown): void {
    // No-op: workspace store manages current workspace
  }

  /** Flag that the editor content has changed since the last save. */
  markChanged(): void {
    workspaceStore.markDirty();
  }

  /** Force an immediate save. */
  async saveNow(): Promise<void> {
    await workspaceStore.save();
  }

  /** Enable or disable autosave. */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /** Reset state. */
  reset(): void {
    this.pendingChanges = false;
    this.isSaving = false;
    this.saveStatus = 'idle';
    this.lastSaved = null;
    this.errorMessage = null;
    this.isEnabled = true;
  }
}

export const autosave = new AutosaveManager();
