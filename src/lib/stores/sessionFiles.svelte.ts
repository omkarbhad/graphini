/**
 * Shared store for session files (uploaded via chat).
 * Chat component updates this when files are uploaded.
 * Sidebar reads from it to display session files.
 */

export interface SessionFile {
  id: string;
  filename: string;
  mediaType: string;
  type: 'image' | 'document' | 'pdf' | 'unknown';
  size: number;
  storedAt: number;
  hasText: boolean;
  textLength: number;
}

let files = $state<SessionFile[]>([]);
let currentSessionId = $state<string | null>(null);
let loading = $state(false);

export const sessionFilesStore = {
  get files() {
    return files;
  },
  get sessionId() {
    return currentSessionId;
  },
  get isLoading() {
    return loading;
  },

  setSessionId(id: string) {
    if (id === currentSessionId) return;
    currentSessionId = id;
    this.refresh();
  },

  async refresh() {
    if (!currentSessionId) return;
    loading = true;
    try {
      const res = await fetch(`/api/files?sessionId=${encodeURIComponent(currentSessionId)}`);
      if (res.ok) {
        const data = await res.json();
        files = data.files || [];
      }
    } catch {
      // silent
    }
    loading = false;
  },

  addFile(file: SessionFile) {
    files = [...files, file];
  },

  removeFile(fileId: string) {
    files = files.filter((f) => f.id !== fileId);
  },

  clear() {
    files = [];
    currentSessionId = null;
  }
};
