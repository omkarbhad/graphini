import { kvDelete, kvGet, kvSet } from '$lib/stores/kvStore';
import { derived, writable } from 'svelte/store';

export type FileSystemItemType = 'file' | 'folder';

export interface UserFile {
  id: string;
  name: string;
  content: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  type: FileSystemItemType;
  parentId: string | null;
}

/** Per-file auxiliary data stored separately from the file list */
export interface FileAuxData {
  markdown: string;
  uiState: Record<string, unknown>;
  chatMessages: Array<{ role: string; content: string; timestamp?: string }>;
}

const FILE_AUX_PREFIX = 'graphini_file_aux_';

function loadFileAux(fileId: string): FileAuxData {
  try {
    const stored = kvGet<FileAuxData>('files', FILE_AUX_PREFIX + fileId);
    if (stored) return stored;
  } catch {}
  return { markdown: '', uiState: {}, chatMessages: [] };
}

// Debounced DB sync per file
const dbSyncTimers: Record<string, ReturnType<typeof setTimeout>> = {};

function syncFileAuxToDb(fileId: string, data: Partial<FileAuxData>): void {
  if (dbSyncTimers[fileId]) clearTimeout(dbSyncTimers[fileId]);
  dbSyncTimers[fileId] = setTimeout(async () => {
    try {
      await fetch('/api/user/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fileId, data })
      });
    } catch {}
  }, 2000);
}

function saveFileAux(fileId: string, data: Partial<FileAuxData>): void {
  try {
    const existing = loadFileAux(fileId);
    const merged = { ...existing, ...data };
    kvSet('files', FILE_AUX_PREFIX + fileId, merged);
  } catch {}
  // Also sync to DB (debounced, fire-and-forget)
  syncFileAuxToDb(fileId, data);
}

function deleteFileAux(fileId: string): void {
  try {
    kvDelete('files', FILE_AUX_PREFIX + fileId);
  } catch {}
}

/** Load file aux data from DB (for logged-in users) and merge with KV store */
async function loadFileAuxFromDb(fileId: string): Promise<FileAuxData> {
  const local = loadFileAux(fileId);
  try {
    const res = await fetch(`/api/user/data?fileId=${fileId}`, { credentials: 'include' });
    if (res.ok) {
      const { data } = await res.json();
      if (data && typeof data === 'object') {
        const merged = { ...local, ...data } as FileAuxData;
        // Update KV store with DB data
        try {
          kvSet('files', FILE_AUX_PREFIX + fileId, merged);
        } catch {}
        return merged;
      }
    }
  } catch {}
  return local;
}

export const fileAuxStore = {
  load: loadFileAux,
  loadFromDb: loadFileAuxFromDb,
  save: saveFileAux,
  delete: deleteFileAux
};

export interface FileVersion {
  id: string;
  fileId: string;
  version: number;
  content: string;
  createdAt: string;
  userId: string;
}

export interface TreeNode {
  item: UserFile;
  children: TreeNode[];
}

interface FileSystemState {
  files: UserFile[];
  currentFile: UserFile | null;
  isLoading: boolean;
  error: string | null;
}

function createFileSystemStore() {
  const { subscribe, set, update } = writable<FileSystemState>({
    files: [],
    currentFile: null,
    isLoading: false,
    error: null
  });

  // Local storage keys
  const FILES_STORAGE_KEY = 'mermaid_files';
  const VERSIONS_STORAGE_KEY = 'mermaid_file_versions';
  const CURRENT_FILE_KEY = 'mermaid_current_file';

  // Helper functions — short prefixed hex IDs
  function shortHex(len = 17): string {
    const arr = new Uint8Array(Math.ceil(len / 2));
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, len);
  }
  function generateFileId(): string {
    return `f-${shortHex()}`;
  }
  function generateFolderId(): string {
    return `g-${shortHex()}`;
  }

  function getCurrentUserId(): string {
    // In a real app, this would come from authentication
    return kvGet<string>('settings', 'user_id') || 'demo_user';
  }

  // Load files from KV store
  function loadFilesFromStorage(): UserFile[] {
    try {
      const stored = kvGet<UserFile[]>('files', FILES_STORAGE_KEY);
      return stored || [];
    } catch (error) {
      console.error('Failed to load files from storage:', error);
      return [];
    }
  }

  // Save files to KV store + debounced DB sync
  let fileSyncTimer: ReturnType<typeof setTimeout> | null = null;
  function saveFilesToStorage(files: UserFile[]): void {
    try {
      kvSet('files', FILES_STORAGE_KEY, files);
    } catch (error) {
      console.error('Failed to save files to storage:', error);
    }
    // Debounced DB sync
    if (fileSyncTimer) clearTimeout(fileSyncTimer);
    fileSyncTimer = setTimeout(async () => {
      try {
        await fetch('/api/user/files', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ files })
        });
      } catch {}
    }, 3000);
  }

  // Load versions from KV store
  function loadVersionsFromStorage(): FileVersion[] {
    try {
      const stored = kvGet<FileVersion[]>('files', VERSIONS_STORAGE_KEY);
      return stored || [];
    } catch (error) {
      console.error('Failed to load versions from storage:', error);
      return [];
    }
  }

  // Save versions to KV store
  function saveVersionsToStorage(versions: FileVersion[]): void {
    try {
      kvSet('files', VERSIONS_STORAGE_KEY, versions);
    } catch (error) {
      console.error('Failed to save versions to storage:', error);
    }
  }

  // Store methods
  return {
    subscribe,

    // Load all user files (KV store + DB merge)
    async loadUserFiles(): Promise<void> {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const allFiles = loadFilesFromStorage();
        const userId = getCurrentUserId();
        let userFiles = allFiles.filter((file) => file.userId === userId);

        // Try loading from DB and merge
        try {
          const res = await fetch('/api/user/files', { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.files) && data.files.length > 0) {
              // Merge: DB files take precedence, add any local-only files
              const dbFileIds = new Set(data.files.map((f: UserFile) => f.id));
              const localOnly = userFiles.filter((f) => !dbFileIds.has(f.id));
              userFiles = [...data.files, ...localOnly];
              // Update KV store with merged result
              saveFilesToStorage(userFiles);
            }
          }
        } catch {}

        update((state) => ({
          ...state,
          files: userFiles,
          isLoading: false
        }));
      } catch (error) {
        update((state) => ({
          ...state,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load files'
        }));
      }
    },

    // Create a new file
    async createFile(name: string): Promise<UserFile> {
      const userId = getCurrentUserId();
      const now = new Date().toISOString();

      const newFile: UserFile = {
        id: generateFileId(),
        name: name.trim(),
        content: '',
        userId,
        createdAt: now,
        updatedAt: now,
        version: 1,
        type: 'file',
        parentId: null
      };

      update((state) => {
        const updatedFiles = [...state.files, newFile];
        saveFilesToStorage(updatedFiles);

        return {
          ...state,
          files: updatedFiles,
          currentFile: newFile
        };
      });

      // Save current file to KV store
      kvSet('files', CURRENT_FILE_KEY, newFile);

      return newFile;
    },

    // Update file content
    async updateFile(fileId: string, content: string): Promise<UserFile | null> {
      let updatedFile: UserFile | undefined;

      update((state) => {
        const fileIndex = state.files.findIndex((f) => f.id === fileId);
        if (fileIndex === -1) return state;

        const newFile: UserFile = {
          ...state.files[fileIndex],
          content,
          updatedAt: new Date().toISOString(),
          version: state.files[fileIndex].version + 1
        };
        updatedFile = newFile;

        const updatedFiles = [...state.files];
        updatedFiles[fileIndex] = newFile;

        saveFilesToStorage(updatedFiles);

        return {
          ...state,
          files: updatedFiles,
          currentFile: newFile
        };
      });

      // Create a version snapshot
      if (updatedFile) {
        await this.createVersion(updatedFile.id, content);
      }

      return updatedFile ?? null;
    },

    // Delete a file
    async deleteFile(fileId: string): Promise<void> {
      update((state) => {
        const updatedFiles = state.files.filter((f) => f.id !== fileId);
        saveFilesToStorage(updatedFiles);

        return {
          ...state,
          files: updatedFiles,
          currentFile: state.currentFile?.id === fileId ? null : state.currentFile
        };
      });

      // Also delete associated versions and aux data
      const versions = loadVersionsFromStorage();
      const remainingVersions = versions.filter((v) => v.fileId !== fileId);
      saveVersionsToStorage(remainingVersions);
      deleteFileAux(fileId);
    },

    // Get file versions
    async getFileVersions(fileId: string): Promise<FileVersion[]> {
      const allVersions = loadVersionsFromStorage();
      return allVersions
        .filter((version) => version.fileId === fileId)
        .sort((a, b) => b.version - a.version); // Most recent first
    },

    // Create a new version
    async createVersion(fileId: string, content: string): Promise<FileVersion> {
      const userId = getCurrentUserId();
      const versions = loadVersionsFromStorage();

      // Get the latest version number for this file
      const fileVersions = versions.filter((v) => v.fileId === fileId);
      const latestVersion = Math.max(0, ...fileVersions.map((v) => v.version));

      const newVersion: FileVersion = {
        id: `v-${shortHex()}`,
        fileId,
        version: latestVersion + 1,
        content,
        createdAt: new Date().toISOString(),
        userId
      };

      const updatedVersions = [...versions, newVersion];
      saveVersionsToStorage(updatedVersions);

      return newVersion;
    },

    // Get specific file version content
    async getFileVersion(fileId: string, versionId: string): Promise<string> {
      const versions = loadVersionsFromStorage();
      const version = versions.find((v) => v.id === versionId && v.fileId === fileId);
      return version?.content || '';
    },

    // Set current file
    setCurrentFile(file: UserFile): void {
      update((state) => ({ ...state, currentFile: file }));
      kvSet('files', CURRENT_FILE_KEY, file);
    },

    // Load current file from storage
    loadCurrentFile(): UserFile | null {
      try {
        const stored = kvGet<UserFile>('files', CURRENT_FILE_KEY);
        return stored || null;
      } catch (error) {
        console.error('Failed to load current file:', error);
        return null;
      }
    },

    // Rename file
    async renameFile(fileId: string, newName: string): Promise<UserFile | null> {
      let updatedFile: UserFile | null = null;

      update((state) => {
        const fileIndex = state.files.findIndex((f) => f.id === fileId);
        if (fileIndex === -1) return state;

        updatedFile = {
          ...state.files[fileIndex],
          name: newName.trim(),
          updatedAt: new Date().toISOString()
        };

        const updatedFiles = [...state.files];
        updatedFiles[fileIndex] = updatedFile;

        saveFilesToStorage(updatedFiles);

        return {
          ...state,
          files: updatedFiles,
          currentFile: state.currentFile?.id === fileId ? updatedFile : state.currentFile
        };
      });

      return updatedFile;
    },

    // Update file name (alias for renameFile)
    async updateFileName(fileId: string, newName: string): Promise<UserFile | null> {
      return this.renameFile(fileId, newName);
    },

    // Get file by ID
    getFileById(fileId: string): UserFile | null {
      let file: UserFile | null = null;
      subscribe((state) => {
        file = state.files.find((f) => f.id === fileId) || null;
      })();
      return file;
    },

    // Create a folder
    async createFolder(name: string, parentId: string | null = null): Promise<UserFile> {
      const userId = getCurrentUserId();
      const now = new Date().toISOString();

      const newFolder: UserFile = {
        id: generateFolderId(),
        name: name.trim(),
        content: '',
        userId,
        createdAt: now,
        updatedAt: now,
        version: 1,
        type: 'folder',
        parentId
      };

      update((state) => {
        const updatedFiles = [...state.files, newFolder];
        saveFilesToStorage(updatedFiles);
        return { ...state, files: updatedFiles };
      });

      return newFolder;
    },

    // Create file in folder
    async createFileInFolder(name: string, parentId: string | null = null): Promise<UserFile> {
      const userId = getCurrentUserId();
      const now = new Date().toISOString();

      const newFile: UserFile = {
        id: generateFileId(),
        name: name.trim(),
        content: '',
        userId,
        createdAt: now,
        updatedAt: now,
        version: 1,
        type: 'file',
        parentId
      };

      update((state) => {
        const updatedFiles = [...state.files, newFile];
        saveFilesToStorage(updatedFiles);
        return { ...state, files: updatedFiles, currentFile: newFile };
      });

      kvSet('files', CURRENT_FILE_KEY, newFile);
      return newFile;
    },

    // Move item to a new parent
    async moveItem(itemId: string, newParentId: string | null): Promise<void> {
      update((state) => {
        const idx = state.files.findIndex((f) => f.id === itemId);
        if (idx === -1) return state;
        // Prevent moving a folder into itself or its descendants
        if (newParentId) {
          let current: string | null = newParentId;
          while (current) {
            if (current === itemId) return state;
            const parent = state.files.find((f) => f.id === current);
            current = parent?.parentId ?? null;
          }
        }
        const updatedFiles = [...state.files];
        updatedFiles[idx] = {
          ...updatedFiles[idx],
          parentId: newParentId,
          updatedAt: new Date().toISOString()
        };
        saveFilesToStorage(updatedFiles);
        return { ...state, files: updatedFiles };
      });
    },

    // Build tree structure from flat list
    buildTree(files: UserFile[]): TreeNode[] {
      const map = new Map<string | null, UserFile[]>();
      for (const f of files) {
        const pid = f.parentId ?? null;
        if (!map.has(pid)) map.set(pid, []);
        map.get(pid)!.push(f);
      }
      function buildChildren(parentId: string | null): TreeNode[] {
        const items = map.get(parentId) || [];
        // Sort: folders first, then alphabetical
        items.sort((a, b) => {
          if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        return items.map((item) => ({
          item,
          children: item.type === 'folder' ? buildChildren(item.id) : []
        }));
      }
      return buildChildren(null);
    },

    // Force immediate DB sync (bypasses debounce)
    async forceSyncToDb(): Promise<boolean> {
      try {
        let files: UserFile[] = [];
        subscribe((state) => {
          files = state.files;
        })();
        if (files.length === 0) return true;
        const res = await fetch('/api/user/files', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ files })
        });
        return res.ok;
      } catch {
        return false;
      }
    },

    // Get current file
    getCurrentFile(): UserFile | null {
      let file: UserFile | null = null;
      subscribe((state) => {
        file = state.currentFile;
      })();
      return file;
    }
  };
}

export const fileSystemStore = createFileSystemStore();

/** Generate a prefixed chat ID (c-xxxxxxxxxxxxxxxxx) */
export function generateChatId(): string {
  const arr = new Uint8Array(9);
  crypto.getRandomValues(arr);
  return `c-${Array.from(arr, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 17)}`;
}

// Derived stores for convenience
export const currentFile = derived(fileSystemStore, (state) => state.currentFile);
export const userFiles = derived(fileSystemStore, (state) => state.files);
export const isLoading = derived(fileSystemStore, (state) => state.isLoading);
