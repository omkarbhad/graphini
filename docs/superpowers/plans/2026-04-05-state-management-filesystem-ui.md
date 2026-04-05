# State Management & File System UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize all client stores to Svelte 5 runes, unify the file model (mermaid + document in one object), move versioning to Neon DB, and redesign the sidebar with Linear/Notion aesthetics.

**Architecture:** Class-based Svelte 5 rune stores replace all `writable()` stores. Each file carries both `mermaid` (diagram code) and `document` (markdown) as first-class fields, eliminating the separate `fileAuxStore`. File versions are persisted to Neon via a new `file_versions` table and API endpoints.

**Tech Stack:** SvelteKit 2 / Svelte 5, Drizzle ORM, Neon Postgres, TailwindCSS 4, Lucide icons

**Spec:** `docs/superpowers/specs/2026-04-05-state-management-filesystem-ui-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/stores/kvStore.svelte.ts` | Reactive KV store (runes) |
| Create | `src/lib/stores/fileSystem.svelte.ts` | Unified file manager (runes) |
| Create | `src/lib/stores/autosave.svelte.ts` | Autosave manager (runes) |
| Create | `src/lib/stores/settings.svelte.ts` | Persistent settings (runes) |
| Modify | `src/lib/stores/panels.svelte.ts` | Merge panel+order into PanelManager class |
| Create | `src/lib/server/db/schema.ts` | Add fileVersions table to Drizzle schema |
| Modify | `src/lib/server/db/neon-adapter.ts` | Add version CRUD methods |
| Modify | `src/lib/server/db/adapter.ts` | Add version methods to interface |
| Create | `src/routes/api/user/files/versions/+server.ts` | Version API endpoint |
| Modify | `src/lib/components/sidebars/PrimarySidebar.svelte` | Linear/Notion redesign |
| Modify | `src/lib/components/panels/DocumentPanel.svelte` | Read/write `currentFile.document` |
| Modify | `src/routes/edit/+page.svelte` | Update all store imports |
| Modify | `src/routes/+layout.svelte` | Update kvStore init |
| Modify | `src/lib/stores/index.ts` | Update barrel exports |
| Modify | `src/lib/features/filesystem/FileSystem.svelte` | Update store imports |
| Modify | `src/lib/features/chat/components/Chat.simple.svelte` | Update store imports |
| Modify | `src/lib/components/editor/DesktopEditor.svelte` | Update kvStore import |
| Modify | `src/lib/components/SettingsModal.svelte` | Update settings import |
| Delete | `src/lib/stores/fileSystem.ts` | Replaced by fileSystem.svelte.ts |
| Delete | `src/lib/stores/autosave.ts` | Replaced by autosave.svelte.ts |
| Delete | `src/lib/stores/kvStore.ts` | Replaced by kvStore.svelte.ts |
| Delete | `src/lib/stores/persistentStore.ts` | Replaced by settings.svelte.ts |

---

### Task 1: Create Reactive KV Store (`kvStore.svelte.ts`)

**Files:**
- Create: `src/lib/stores/kvStore.svelte.ts`

This is the foundation — all other stores depend on it.

- [ ] **Step 1: Create kvStore.svelte.ts**

```typescript
// src/lib/stores/kvStore.svelte.ts
/**
 * Reactive KV Store — Svelte 5 runes version.
 * In-memory cache + localStorage fallback + debounced server sync.
 */

const LS_PREFIX = 'kv::';
const FLUSH_DELAY = 1500;

function lsGet(ck: string): unknown | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(LS_PREFIX + ck);
    return raw !== null ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function lsSet(ck: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LS_PREFIX + ck, JSON.stringify(value));
  } catch { /* quota */ }
}

function lsDel(ck: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(LS_PREFIX + ck);
  } catch { /* ignore */ }
}

function cacheKey(category: string, key: string): string {
  return `${category}::${key}`;
}

class KvStore {
  initialized = $state(false);
  isAuthenticated = $state(false);
  hasPending = $state(false);
  lastSavedAt = $state<number | null>(null);

  private memCache = new Map<string, unknown>();
  private pendingWrites = new Map<string, { category: string; key: string; value: unknown }>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._doInit();
    return this.initPromise;
  }

  private async _doInit(): Promise<void> {
    // Load localStorage first for instant availability
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(LS_PREFIX)) {
          try {
            const ck = k.slice(LS_PREFIX.length);
            if (!this.memCache.has(ck)) {
              this.memCache.set(ck, JSON.parse(localStorage.getItem(k)!));
            }
          } catch { /* ignore */ }
        }
      }
    }
    try {
      const res = await fetch('/api/kv', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const entries = data.entries || [];
        for (const e of entries) {
          const ck = cacheKey(e.category, e.key);
          this.memCache.set(ck, e.value);
          lsSet(ck, e.value);
        }
        this.isAuthenticated = true;
      } else {
        this.isAuthenticated = false;
      }
    } catch {
      // localStorage data is already loaded
    }
    this.initialized = true;
  }

  get<T = unknown>(category: string, key: string): T | null {
    const v = this.memCache.get(cacheKey(category, key));
    return v !== undefined ? (v as T) : null;
  }

  set(category: string, key: string, value: unknown): void {
    const ck = cacheKey(category, key);
    this.memCache.set(ck, value);
    lsSet(ck, value);
    this.pendingWrites.set(ck, { category, key, value });
    this.hasPending = true;
    this.scheduleFlush();
  }

  delete(category: string, key: string): void {
    const ck = cacheKey(category, key);
    this.memCache.delete(ck);
    lsDel(ck);
    this.pendingWrites.delete(ck);
    this.hasPending = this.pendingWrites.size > 0;
    if (!this.isAuthenticated) return;
    fetch(`/api/kv?category=${encodeURIComponent(category)}&key=${encodeURIComponent(key)}`, {
      method: 'DELETE', credentials: 'include', keepalive: true
    }).catch(() => {});
  }

  getCategory<T = unknown>(category: string): Record<string, T> {
    const result: Record<string, T> = {};
    for (const [k, v] of this.memCache.entries()) {
      if (k.startsWith(category + '::')) {
        result[k.slice(category.length + 2)] = v as T;
      }
    }
    return result;
  }

  getAll(): { category: string; key: string; value: unknown }[] {
    const result: { category: string; key: string; value: unknown }[] = [];
    for (const [k, v] of this.memCache.entries()) {
      const [category, ...rest] = k.split('::');
      result.push({ category, key: rest.join('::'), value: v });
    }
    return result;
  }

  async flush(): Promise<void> {
    if (this.pendingWrites.size === 0) return;
    if (!this.isAuthenticated) {
      this.pendingWrites.clear();
      this.hasPending = false;
      return;
    }
    const batch = Array.from(this.pendingWrites.values());
    this.pendingWrites.clear();
    try {
      await fetch('/api/kv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        keepalive: true,
        body: JSON.stringify({ batch })
      });
      this.lastSavedAt = Date.now();
      this.hasPending = false;
    } catch {
      // Re-queue on failure
      for (const entry of batch) {
        this.pendingWrites.set(cacheKey(entry.category, entry.key), entry);
      }
      this.hasPending = true;
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, FLUSH_DELAY);
  }

  reset(): void {
    if (typeof localStorage !== 'undefined') {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(LS_PREFIX)) toRemove.push(k);
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    }
    this.memCache.clear();
    this.pendingWrites.clear();
    this.initialized = false;
    this.isAuthenticated = false;
    this.hasPending = false;
    this.initPromise = null;
  }
}

export const kv = new KvStore();

// Register beforeunload for pending writes
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (kv.hasPending && kv.isAuthenticated) {
      const batch = Array.from((kv as any).pendingWrites.values());
      if (batch.length > 0) {
        navigator.sendBeacon(
          '/api/kv',
          new Blob([JSON.stringify({ batch })], { type: 'application/json' })
        );
      }
    }
  });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm exec svelte-check --threshold error 2>&1 | head -30`

No errors expected from the new file since nothing imports it yet.

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/kvStore.svelte.ts
git commit -m "feat: add Svelte 5 runes KV store (kvStore.svelte.ts)"
```

---

### Task 2: Create File Versions DB Table & API

**Files:**
- Modify: `src/lib/server/db/schema.ts`
- Modify: `src/lib/server/db/adapter.ts`
- Modify: `src/lib/server/db/neon-adapter.ts`
- Create: `src/routes/api/user/files/versions/+server.ts`

- [ ] **Step 1: Add fileVersions to Drizzle schema**

Add to end of `src/lib/server/db/schema.ts`:

```typescript
// ── File Versions ──────────────────────────────────────────────────────────

export const fileVersions = pgTable(
  'file_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    file_id: text('file_id').notNull(),
    user_id: text('user_id').notNull(),
    version: integer('version').notNull(),
    content_mermaid: text('content_mermaid').notNull().default(''),
    content_document: text('content_document').notNull().default(''),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index('idx_file_versions_file').on(t.file_id, t.version)]
);
```

- [ ] **Step 2: Add version methods to DatabaseAdapter interface**

Add to `src/lib/server/db/adapter.ts` before the `healthCheck` method:

```typescript
  // ── File Versions ────────────────────────────────────────────────────────
  createFileVersion(data: {
    file_id: string;
    user_id: string;
    version: number;
    content_mermaid: string;
    content_document: string;
  }): Promise<{ id: string; version: number; created_at: string }>;
  listFileVersions(file_id: string, limit?: number): Promise<Array<{
    id: string;
    file_id: string;
    version: number;
    content_mermaid: string;
    content_document: string;
    created_at: string;
  }>>;
  pruneFileVersions(file_id: string, keepCount: number): Promise<number>;
```

- [ ] **Step 3: Implement version methods in NeonAdapter**

Add to `src/lib/server/db/neon-adapter.ts` before the `healthCheck` method:

```typescript
  // ── File Versions ────────────────────────────────────────────────────────

  async createFileVersion(data: {
    file_id: string;
    user_id: string;
    version: number;
    content_mermaid: string;
    content_document: string;
  }): Promise<{ id: string; version: number; created_at: string }> {
    const [row] = await this.db
      .insert(schema.fileVersions)
      .values(data)
      .returning({
        id: schema.fileVersions.id,
        version: schema.fileVersions.version,
        created_at: schema.fileVersions.created_at
      });
    return { id: row.id, version: row.version, created_at: row.created_at.toISOString() };
  }

  async listFileVersions(file_id: string, limit = 50): Promise<Array<{
    id: string;
    file_id: string;
    version: number;
    content_mermaid: string;
    content_document: string;
    created_at: string;
  }>> {
    const rows = await this.db
      .select()
      .from(schema.fileVersions)
      .where(eq(schema.fileVersions.file_id, file_id))
      .orderBy(desc(schema.fileVersions.version))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      file_id: r.file_id,
      version: r.version,
      content_mermaid: r.content_mermaid,
      content_document: r.content_document,
      created_at: r.created_at.toISOString()
    }));
  }

  async pruneFileVersions(file_id: string, keepCount: number): Promise<number> {
    const keep = await this.db
      .select({ id: schema.fileVersions.id })
      .from(schema.fileVersions)
      .where(eq(schema.fileVersions.file_id, file_id))
      .orderBy(desc(schema.fileVersions.version))
      .limit(keepCount);
    const keepIds = keep.map((r) => r.id);
    if (keepIds.length === 0) return 0;
    const deleted = await this.db
      .delete(schema.fileVersions)
      .where(
        and(
          eq(schema.fileVersions.file_id, file_id),
          not(inArray(schema.fileVersions.id, keepIds))
        )
      )
      .returning({ id: schema.fileVersions.id });
    return deleted.length;
  }
```

- [ ] **Step 4: Push file_versions table to Neon**

```bash
node --input-type=module -e "
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
await sql.query('CREATE TABLE IF NOT EXISTS file_versions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), file_id TEXT NOT NULL, user_id TEXT NOT NULL, version INTEGER NOT NULL, content_mermaid TEXT NOT NULL DEFAULT \\'\\', content_document TEXT NOT NULL DEFAULT \\'\\', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
await sql.query('CREATE INDEX IF NOT EXISTS idx_file_versions_file ON file_versions(file_id, version DESC)');
console.log('file_versions table created');
"
```

- [ ] **Step 5: Create versions API endpoint**

```typescript
// src/routes/api/user/files/versions/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, locals }) => {
  const userId = (locals as any).userId;
  if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

  const fileId = url.searchParams.get('fileId');
  if (!fileId) return json({ error: 'fileId required' }, { status: 400 });

  try {
    const db = getDb();
    const versions = await db.listFileVersions(fileId, 50);
    return json({ versions });
  } catch (e: any) {
    return json({ error: e.message }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const userId = (locals as any).userId;
  if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { file_id, version, content_mermaid, content_document } = await request.json();
    if (!file_id) return json({ error: 'file_id required' }, { status: 400 });

    const db = getDb();
    const result = await db.createFileVersion({
      file_id,
      user_id: userId,
      version: version || 1,
      content_mermaid: content_mermaid || '',
      content_document: content_document || ''
    });

    // Prune old versions (keep max 50)
    await db.pruneFileVersions(file_id, 50);

    return json({ version: result });
  } catch (e: any) {
    return json({ error: e.message }, { status: 500 });
  }
};
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/db/schema.ts src/lib/server/db/adapter.ts src/lib/server/db/neon-adapter.ts src/routes/api/user/files/versions/
git commit -m "feat: add file_versions table, adapter methods, and API endpoint"
```

---

### Task 3: Create Unified File System Store (`fileSystem.svelte.ts`)

**Files:**
- Create: `src/lib/stores/fileSystem.svelte.ts`

The new unified file model: each file has both `mermaid` and `document` fields.

- [ ] **Step 1: Create fileSystem.svelte.ts**

```typescript
// src/lib/stores/fileSystem.svelte.ts
/**
 * Reactive File System Manager — Svelte 5 runes.
 * Each file stores both mermaid diagram code and markdown document.
 */

import { kv } from '$lib/stores/kvStore.svelte';

export type FileSystemItemType = 'file' | 'folder';

export interface UserFile {
  id: string;
  name: string;
  mermaid: string;
  document: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  type: FileSystemItemType;
  parentId: string | null;
}

export interface FileVersion {
  id: string;
  file_id: string;
  version: number;
  content_mermaid: string;
  content_document: string;
  created_at: string;
}

export interface TreeNode {
  item: UserFile;
  children: TreeNode[];
}

const FILES_STORAGE_KEY = 'mermaid_files';
const CURRENT_FILE_KEY = 'mermaid_current_file';

function shortHex(len = 17): string {
  const arr = new Uint8Array(Math.ceil(len / 2));
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, len);
}

class FileSystemManager {
  files = $state<UserFile[]>([]);
  currentFile = $state<UserFile | null>(null);
  isLoading = $state(false);
  error = $state<string | null>(null);

  fileTree = $derived.by(() => this.buildTree(this.files));

  private fileSyncTimer: ReturnType<typeof setTimeout> | null = null;

  private getCurrentUserId(): string {
    return kv.get<string>('settings', 'user_id') || 'demo_user';
  }

  // ── Load ──────────────────────────────────────────────────────────────

  async loadUserFiles(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    try {
      const stored = kv.get<UserFile[]>('files', FILES_STORAGE_KEY) || [];
      const userId = this.getCurrentUserId();
      let userFiles = stored.filter((f) => f.userId === userId);

      // Migrate: rename content→mermaid if needed
      userFiles = userFiles.map((f) => {
        if ('content' in f && !('mermaid' in f)) {
          const legacy = f as any;
          return { ...f, mermaid: legacy.content || '', document: legacy.document || '' };
        }
        if (!('document' in f)) {
          return { ...f, document: '' };
        }
        return f;
      });

      // Merge with DB
      try {
        const res = await fetch('/api/user/files', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.files) && data.files.length > 0) {
            const dbFiles = data.files.map((f: any) => ({
              ...f,
              mermaid: f.mermaid ?? f.content ?? '',
              document: f.document ?? ''
            }));
            const dbIds = new Set(dbFiles.map((f: UserFile) => f.id));
            const localOnly = userFiles.filter((f) => !dbIds.has(f.id));
            userFiles = [...dbFiles, ...localOnly];
            kv.set('files', FILES_STORAGE_KEY, userFiles);
          }
        }
      } catch { /* offline fallback */ }

      this.files = userFiles;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to load files';
    } finally {
      this.isLoading = false;
    }
  }

  // ── Persistence ───────────────────────────────────────────────────────

  private saveFiles(): void {
    kv.set('files', FILES_STORAGE_KEY, this.files);
    this.scheduleSyncToDb();
  }

  private scheduleSyncToDb(): void {
    if (this.fileSyncTimer) clearTimeout(this.fileSyncTimer);
    this.fileSyncTimer = setTimeout(() => this.syncToDb(), 2000);
  }

  private async syncToDb(): Promise<boolean> {
    try {
      const res = await fetch('/api/user/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ files: this.files })
      });
      if (res.ok) {
        this.error = null;
        return true;
      }
      this.error = 'Sync failed';
      return false;
    } catch {
      this.error = "Couldn't reach server";
      return false;
    }
  }

  async forceSyncToDb(): Promise<boolean> {
    if (this.files.length === 0) return true;
    return this.syncToDb();
  }

  // ── CRUD ──────────────────────────────────────────────────────────────

  createFile(name: string, parentId: string | null = null): UserFile {
    const now = new Date().toISOString();
    const newFile: UserFile = {
      id: `f-${shortHex()}`,
      name: name.trim(),
      mermaid: '',
      document: '',
      userId: this.getCurrentUserId(),
      createdAt: now,
      updatedAt: now,
      version: 1,
      type: 'file',
      parentId
    };
    this.files = [...this.files, newFile];
    this.currentFile = newFile;
    kv.set('files', CURRENT_FILE_KEY, newFile);
    this.saveFiles();
    return newFile;
  }

  createFolder(name: string, parentId: string | null = null): UserFile {
    const now = new Date().toISOString();
    const folder: UserFile = {
      id: `g-${shortHex()}`,
      name: name.trim(),
      mermaid: '',
      document: '',
      userId: this.getCurrentUserId(),
      createdAt: now,
      updatedAt: now,
      version: 1,
      type: 'folder',
      parentId
    };
    this.files = [...this.files, folder];
    this.saveFiles();
    return folder;
  }

  updateFile(fileId: string, updates: Partial<Pick<UserFile, 'mermaid' | 'document'>>): UserFile | null {
    const idx = this.files.findIndex((f) => f.id === fileId);
    if (idx === -1) return null;

    const updated: UserFile = {
      ...this.files[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
      version: this.files[idx].version + 1
    };
    const newFiles = [...this.files];
    newFiles[idx] = updated;
    this.files = newFiles;
    if (this.currentFile?.id === fileId) this.currentFile = updated;
    this.saveFiles();
    return updated;
  }

  deleteFile(fileId: string): void {
    this.files = this.files.filter((f) => f.id !== fileId);
    if (this.currentFile?.id === fileId) this.currentFile = null;
    this.saveFiles();
  }

  renameFile(fileId: string, newName: string): UserFile | null {
    const idx = this.files.findIndex((f) => f.id === fileId);
    if (idx === -1) return null;
    const updated: UserFile = {
      ...this.files[idx],
      name: newName.trim(),
      updatedAt: new Date().toISOString()
    };
    const newFiles = [...this.files];
    newFiles[idx] = updated;
    this.files = newFiles;
    if (this.currentFile?.id === fileId) this.currentFile = updated;
    this.saveFiles();
    return updated;
  }

  moveItem(itemId: string, newParentId: string | null): void {
    const idx = this.files.findIndex((f) => f.id === itemId);
    if (idx === -1) return;
    // Prevent circular move
    if (newParentId) {
      let current: string | null = newParentId;
      while (current) {
        if (current === itemId) return;
        const parent = this.files.find((f) => f.id === current);
        current = parent?.parentId ?? null;
      }
    }
    const newFiles = [...this.files];
    newFiles[idx] = { ...newFiles[idx], parentId: newParentId, updatedAt: new Date().toISOString() };
    this.files = newFiles;
    this.saveFiles();
  }

  setCurrentFile(file: UserFile): void {
    this.currentFile = file;
    kv.set('files', CURRENT_FILE_KEY, file);
  }

  loadCurrentFile(): UserFile | null {
    return kv.get<UserFile>('files', CURRENT_FILE_KEY) || null;
  }

  getFileById(fileId: string): UserFile | null {
    return this.files.find((f) => f.id === fileId) || null;
  }

  // ── Versions (Neon DB) ────────────────────────────────────────────────

  async createVersion(fileId: string): Promise<void> {
    const file = this.getFileById(fileId);
    if (!file) return;
    try {
      await fetch('/api/user/files/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          file_id: fileId,
          version: file.version,
          content_mermaid: file.mermaid,
          content_document: file.document
        })
      });
    } catch { /* fire and forget */ }
  }

  async getVersions(fileId: string): Promise<FileVersion[]> {
    try {
      const res = await fetch(`/api/user/files/versions?fileId=${encodeURIComponent(fileId)}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        return data.versions || [];
      }
    } catch { /* offline */ }
    return [];
  }

  // ── Tree ──────────────────────────────────────────────────────────────

  buildTree(files: UserFile[]): TreeNode[] {
    const map = new Map<string | null, UserFile[]>();
    for (const f of files) {
      const pid = f.parentId ?? null;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid)!.push(f);
    }
    function buildChildren(parentId: string | null): TreeNode[] {
      const items = map.get(parentId) || [];
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
  }
}

export const fileSystem = new FileSystemManager();

export function generateChatId(): string {
  const arr = new Uint8Array(9);
  crypto.getRandomValues(arr);
  return `c-${Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 17)}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/stores/fileSystem.svelte.ts
git commit -m "feat: add Svelte 5 runes file system store with unified mermaid+document model"
```

---

### Task 4: Create Autosave Store (`autosave.svelte.ts`)

**Files:**
- Create: `src/lib/stores/autosave.svelte.ts`

- [ ] **Step 1: Create autosave.svelte.ts**

```typescript
// src/lib/stores/autosave.svelte.ts
/**
 * Reactive Autosave Manager — Svelte 5 runes.
 */

import { inputStateStore } from '$lib/util/state';
import { get } from 'svelte/store';
import { fileSystem, type UserFile } from '$lib/stores/fileSystem.svelte';

class AutosaveManager {
  pendingChanges = $state(false);
  isSaving = $state(false);
  saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
  lastSaved = $state<string | null>(null);
  errorMessage = $state<string | null>(null);
  isEnabled = $state(true);

  private timer: ReturnType<typeof setInterval> | null = null;
  private currentFileId: string | null = null;
  private interval = 2000;

  init(): void {
    this.startTimer();
  }

  setCurrentFile(file: UserFile | null): void {
    this.currentFileId = file?.id || null;
    this.pendingChanges = false;
    this.lastSaved = file?.updatedAt || null;
    this.errorMessage = null;
    this.saveStatus = 'idle';
  }

  markChanged(): void {
    this.pendingChanges = true;
  }

  async saveNow(): Promise<void> {
    if (!this.currentFileId || !this.pendingChanges) return;
    await this.performSave();
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled) this.startTimer();
    else this.stopTimer();
  }

  reset(): void {
    this.stopTimer();
    this.currentFileId = null;
    this.pendingChanges = false;
    this.isSaving = false;
    this.saveStatus = 'idle';
    this.lastSaved = null;
    this.errorMessage = null;
  }

  private startTimer(): void {
    this.stopTimer();
    this.timer = setInterval(async () => {
      if (this.isEnabled && this.pendingChanges && this.currentFileId && !this.isSaving) {
        await this.performSave();
      }
    }, this.interval);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async performSave(): Promise<void> {
    if (!this.currentFileId) return;
    this.isSaving = true;
    this.saveStatus = 'saving';
    this.errorMessage = null;

    try {
      const state = get(inputStateStore);
      const mermaid = state.code || '';
      const doc = fileSystem.currentFile?.document || '';

      fileSystem.updateFile(this.currentFileId, { mermaid, document: doc });

      // Create version in Neon (fire-and-forget)
      fileSystem.createVersion(this.currentFileId);

      // Force immediate DB sync
      const ok = await fileSystem.forceSyncToDb();
      if (!ok) throw new Error("Couldn't reach server");

      this.isSaving = false;
      this.saveStatus = 'saved';
      this.lastSaved = new Date().toISOString();
      this.pendingChanges = false;
      this.errorMessage = null;

      setTimeout(() => {
        if (this.saveStatus === 'saved') this.saveStatus = 'idle';
      }, 2000);
    } catch (e) {
      this.isSaving = false;
      this.saveStatus = 'error';
      this.errorMessage = e instanceof Error ? e.message : 'Save failed';

      setTimeout(() => {
        if (this.saveStatus === 'error') this.saveStatus = 'idle';
      }, 5000);
    }
  }
}

export const autosave = new AutosaveManager();
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/stores/autosave.svelte.ts
git commit -m "feat: add Svelte 5 runes autosave store"
```

---

### Task 5: Create Settings Store (`settings.svelte.ts`)

**Files:**
- Create: `src/lib/stores/settings.svelte.ts`

- [ ] **Step 1: Create settings.svelte.ts**

```typescript
// src/lib/stores/settings.svelte.ts
/**
 * Persistent Settings — Svelte 5 runes.
 * Replaces persistentStore.ts with rune-based classes.
 */

import { browser } from '$app/environment';
import { kv } from '$lib/stores/kvStore.svelte';

const STORAGE_PREFIX = 'mermaid_';

class PersistentSetting<T extends Record<string, unknown>> {
  value = $state<T>(undefined as unknown as T);
  private key: string;
  private defaultValue: T;

  constructor(key: string, defaultValue: T) {
    this.key = key;
    this.defaultValue = defaultValue;
    this.value = this.load();
  }

  private load(): T {
    if (!browser) return { ...this.defaultValue };
    const stored = kv.get<T>('settings', `${STORAGE_PREFIX}${this.key}`);
    if (stored && typeof stored === 'object') {
      return { ...this.defaultValue, ...stored };
    }
    return { ...this.defaultValue };
  }

  set(newValue: T): void {
    this.value = newValue;
    this.persist();
  }

  update(fn: (v: T) => T): void {
    this.value = fn(this.value);
    this.persist();
  }

  reset(): void {
    this.value = { ...this.defaultValue };
    this.persist();
  }

  private persist(): void {
    if (!browser) return;
    kv.set('settings', `${STORAGE_PREFIX}${this.key}`, this.value);
  }
}

// ── UI Settings ─────────────────────────────────────────────────────────

export interface UISettings {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  showReasoning: boolean;
  autoScroll: boolean;
  compactMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

export const uiSettings = new PersistentSetting<UISettings>('ui_settings', {
  theme: 'system',
  sidebarOpen: true,
  showReasoning: true,
  autoScroll: true,
  compactMode: false,
  fontSize: 'medium'
});

// ── AI Settings ─────────────────────────────────────────────────────────

export interface AISettings {
  provider: 'openai' | 'anthropic' | 'openrouter' | 'kilo' | 'gemini';
  model: string;
  providerModel?: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
  promptMode: 'simple' | 'advanced' | 'visual';
  streamResponse: boolean;
  favoriteModels: string[];
  openaiApiKey?: string;
  anthropicApiKey?: string;
  openrouterApiKey?: string;
  kiloApiKey?: string;
  geminiApiKey?: string;
}

export const aiSettings = new PersistentSetting<AISettings>('ai_settings', {
  provider: 'openai',
  model: 'gpt-4o',
  providerModel: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 4000,
  promptMode: 'simple',
  streamResponse: true,
  favoriteModels: ['gpt-4o', 'anthropic/claude-3.5-sonnet', 'gemini-3-flash-preview'],
  openaiApiKey: '',
  anthropicApiKey: '',
  openrouterApiKey: '',
  kiloApiKey: '',
  geminiApiKey: ''
});

// ── Editor Settings ─────────────────────────────────────────────────────

export interface EditorSettings {
  autoFormat: boolean;
  lineNumbers: boolean;
  wordWrap: boolean;
  minimap: boolean;
  tabSize: number;
  autoSave: boolean;
  autoSaveDelay: number;
}

export const editorSettings = new PersistentSetting<EditorSettings>('editor_settings', {
  autoFormat: true,
  lineNumbers: true,
  wordWrap: true,
  minimap: false,
  tabSize: 2,
  autoSave: true,
  autoSaveDelay: 1000
});

// ── Session Helpers ─────────────────────────────────────────────────────

export function getSessionId(): string {
  if (!browser) return 'server';
  let sessionId = kv.get<string>('session', 'session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    kv.set('session', 'session_id', sessionId);
  }
  return sessionId;
}

export function getUserId(): string | null {
  if (!browser) return null;
  return kv.get<string>('settings', `${STORAGE_PREFIX}user_id`);
}

export function setUserId(userId: string): void {
  if (!browser) return;
  kv.set('settings', `${STORAGE_PREFIX}user_id`, userId);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/stores/settings.svelte.ts
git commit -m "feat: add Svelte 5 runes settings store"
```

---

### Task 6: Rewrite Panels Store

**Files:**
- Modify: `src/lib/stores/panels.svelte.ts`

- [ ] **Step 1: Rewrite panels.svelte.ts to class-based PanelManager**

Replace the entire contents of `src/lib/stores/panels.svelte.ts` with:

```typescript
// src/lib/stores/panels.svelte.ts
/**
 * Panel Manager — Svelte 5 runes.
 * Merged panelOrderStore + panelStore into single class.
 */

import { kv } from '$lib/stores/kvStore.svelte';

export type PanelId = 'files' | 'canvas' | 'document' | 'code' | 'chat';

export interface PanelConfig {
  id: PanelId;
  label: string;
  visible: boolean;
  width: number;
  minWidth: number;
  maxWidth: number;
  flex?: boolean;
}

const DEFAULT_ORDER: PanelId[] = ['files', 'canvas', 'document', 'code', 'chat'];

const PANEL_DEFAULTS: Record<PanelId, Omit<PanelConfig, 'id'>> = {
  files: { label: 'Files', visible: true, width: 260, minWidth: 180, maxWidth: 9999 },
  canvas: { label: 'Canvas', visible: true, width: 0, minWidth: 200, maxWidth: 9999, flex: true },
  document: { label: 'Document', visible: false, width: 400, minWidth: 220, maxWidth: 9999 },
  code: { label: 'Code', visible: true, width: 350, minWidth: 220, maxWidth: 9999 },
  chat: { label: 'Chat', visible: true, width: 380, minWidth: 220, maxWidth: 9999 }
};

const STATE_KEY = 'graphini_panels_v2';
const ORDER_KEY = 'graphini_panel_order_v1';

let serverSyncTimeout: ReturnType<typeof setTimeout> | null = null;

async function savePrefsToServer(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  if (serverSyncTimeout) clearTimeout(serverSyncTimeout);
  serverSyncTimeout = setTimeout(async () => {
    try {
      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: { [key]: value } }),
        credentials: 'include'
      });
    } catch { /* silent */ }
  }, 300);
}

class PanelManager {
  panels = $state<Record<PanelId, PanelConfig>>(this.loadState());
  order = $state<PanelId[]>(this.loadOrder());

  visiblePanels = $derived(
    this.order.filter((id) => this.panels[id].visible).map((id) => this.panels[id])
  );

  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  toggle(id: PanelId): void {
    this.panels[id].visible = !this.panels[id].visible;
    this.panels = { ...this.panels };
    this.debouncedSave();
  }

  show(id: PanelId): void {
    this.panels[id].visible = true;
    this.panels = { ...this.panels };
    this.debouncedSave();
  }

  hide(id: PanelId): void {
    this.panels[id].visible = false;
    this.panels = { ...this.panels };
    this.debouncedSave();
  }

  setWidth(id: PanelId, width: number): void {
    this.panels[id].width = Math.max(this.panels[id].minWidth, width);
    this.panels = { ...this.panels };
    this.debouncedSave();
  }

  reorder(newOrder: PanelId[]): void {
    this.order = newOrder;
    kv.set('panels', ORDER_KEY, newOrder);
    savePrefsToServer('panelOrder', newOrder);
  }

  reset(): void {
    this.panels = this.buildDefaults();
    this.order = [...DEFAULT_ORDER];
    this.persistState();
    kv.set('panels', ORDER_KEY, this.order);
  }

  private debouncedSave(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.persistState(), 150);
  }

  private persistState(): void {
    if (typeof window === 'undefined') return;
    const toSave: Partial<Record<PanelId, { visible: boolean; width: number }>> = {};
    for (const id of DEFAULT_ORDER) {
      toSave[id] = { visible: this.panels[id].visible, width: this.panels[id].width };
    }
    kv.set('panels', STATE_KEY, toSave);
    savePrefsToServer('panelState', toSave);
  }

  private loadState(): Record<PanelId, PanelConfig> {
    const defaults = this.buildDefaults();
    if (typeof window === 'undefined') return defaults;
    try {
      const saved = kv.get<Partial<Record<PanelId, Partial<PanelConfig>>>>('panels', STATE_KEY);
      if (!saved) return defaults;
      for (const id of DEFAULT_ORDER) {
        if (saved[id]) {
          if (typeof saved[id]!.visible === 'boolean') defaults[id].visible = saved[id]!.visible!;
          if (typeof saved[id]!.width === 'number') {
            defaults[id].width = Math.max(defaults[id].minWidth, saved[id]!.width!);
          }
        }
      }
    } catch { /* use defaults */ }
    return defaults;
  }

  private loadOrder(): PanelId[] {
    if (typeof window === 'undefined') return [...DEFAULT_ORDER];
    try {
      const saved = kv.get<PanelId[]>('panels', ORDER_KEY);
      if (Array.isArray(saved) && saved.length === DEFAULT_ORDER.length &&
          DEFAULT_ORDER.every((id) => saved.includes(id))) {
        return saved;
      }
    } catch { /* use default */ }
    return [...DEFAULT_ORDER];
  }

  private buildDefaults(): Record<PanelId, PanelConfig> {
    return Object.fromEntries(
      DEFAULT_ORDER.map((id) => [id, { id, ...PANEL_DEFAULTS[id] }])
    ) as Record<PanelId, PanelConfig>;
  }
}

export const panels = new PanelManager();
export const PANEL_ORDER = DEFAULT_ORDER;

/** Call after login to pull server prefs into stores */
export async function syncPreferencesFromServer(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/user/preferences', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    const prefs = data.preferences;
    if (!prefs) return;

    if (prefs.panelOrder) {
      const order = prefs.panelOrder as PanelId[];
      if (Array.isArray(order) && order.length === DEFAULT_ORDER.length &&
          DEFAULT_ORDER.every((id) => order.includes(id))) {
        panels.order = order;
        kv.set('panels', ORDER_KEY, order);
      }
    }
    if (prefs.panelState) {
      const saved = prefs.panelState as Partial<Record<PanelId, { visible: boolean; width: number }>>;
      for (const id of DEFAULT_ORDER) {
        if (saved[id]) {
          if (typeof saved[id]!.visible === 'boolean') {
            if (saved[id]!.visible) panels.show(id);
            else panels.hide(id);
          }
          if (typeof saved[id]!.width === 'number') panels.setWidth(id, saved[id]!.width);
        }
      }
    }
  } catch { /* silent */ }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/stores/panels.svelte.ts
git commit -m "refactor: rewrite panels store to Svelte 5 runes PanelManager class"
```

---

### Task 7: Update All Import Sites

**Files:**
- Modify: `src/routes/+layout.svelte`
- Modify: `src/routes/edit/+page.svelte`
- Modify: `src/lib/components/sidebars/PrimarySidebar.svelte`
- Modify: `src/lib/components/panels/DocumentPanel.svelte`
- Modify: `src/lib/features/filesystem/FileSystem.svelte`
- Modify: `src/lib/features/chat/components/Chat.simple.svelte`
- Modify: `src/lib/components/editor/DesktopEditor.svelte`
- Modify: `src/lib/components/SettingsModal.svelte`
- Modify: `src/lib/stores/index.ts`
- Modify: `src/lib/stores/toolsStore.ts`
- Modify: `src/lib/util/exportState.ts`

This task updates every file that imports from the old stores to use the new rune-based stores. The key changes are:

**Import mapping:**
| Old | New |
|-----|-----|
| `import { kvGet, kvSet, kvDelete, kvFlush, kvInit, kvReset, kvOnSyncChange, kvSyncStatus, kvGetAll, kvGetCategory, kvIsReady } from '$lib/stores/kvStore'` | `import { kv } from '$lib/stores/kvStore.svelte'` |
| `import { fileSystemStore, fileAuxStore, type UserFile, type TreeNode } from '$lib/stores/fileSystem'` | `import { fileSystem, type UserFile, type TreeNode } from '$lib/stores/fileSystem.svelte'` |
| `import { autosaveStore } from '$lib/stores/autosave'` | `import { autosave } from '$lib/stores/autosave.svelte'` |
| `import { panelStore, panelOrderStore } from '$lib/stores/panels.svelte'` | `import { panels } from '$lib/stores/panels.svelte'` |
| `import { aiSettingsStore, uiSettingsStore, ... } from '$lib/stores/persistentStore'` | `import { aiSettings, uiSettings, ... } from '$lib/stores/settings.svelte'` |

**Usage mapping:**
| Old pattern | New pattern |
|-------------|-------------|
| `$fileSystemStore.files` | `fileSystem.files` |
| `$fileSystemStore.currentFile` | `fileSystem.currentFile` |
| `fileSystemStore.loadUserFiles()` | `fileSystem.loadUserFiles()` |
| `fileSystemStore.createFile(name)` | `fileSystem.createFile(name)` |
| `fileSystemStore.updateFile(id, content)` | `fileSystem.updateFile(id, { mermaid })` |
| `fileAuxStore.load(id)` | `fileSystem.currentFile?.document` |
| `fileAuxStore.save(id, { markdown })` | `fileSystem.updateFile(id, { document })` |
| `$autosaveStore.pendingChanges` | `autosave.pendingChanges` |
| `autosaveStore.saveNow()` | `autosave.saveNow()` |
| `autosaveStore.init()` | `autosave.init()` |
| `kvGet(cat, key)` | `kv.get(cat, key)` |
| `kvSet(cat, key, val)` | `kv.set(cat, key, val)` |
| `kvInit()` | `kv.init()` |
| `kvFlush()` | `kv.flush()` |
| `$panelStore` | `panels.panels` |
| `$panelOrderStore` | `panels.order` |
| `panelStore.toggle(id)` | `panels.toggle(id)` |
| `panelStore.setWidth(id, w)` | `panels.setWidth(id, w)` |
| `panelOrderStore.reorder(order)` | `panels.reorder(order)` |
| `get(panelStore)` | `panels.panels` (direct read, no `get()` needed) |
| `get(panelOrderStore)` | `panels.order` |

- [ ] **Step 1: Update each import site**

Apply the import mapping and usage mapping above to each file listed. This is a mechanical find-and-replace in each file. For each file:

1. Replace the import statement
2. Replace all usages of the old API with the new API
3. Remove any `$` prefix store subscriptions (runes don't need them)
4. Remove `get()` calls from `svelte/store` where reading rune properties directly
5. For DocumentPanel: replace `fileAuxStore.load(id)` / `fileAuxStore.save(id, { markdown })` with direct reads/writes on `fileSystem.currentFile.document` and `fileSystem.updateFile(id, { document })`
6. For DocumentPanel: replace `fileSystemStore.subscribe()` with `$effect` watching `fileSystem.currentFile`

- [ ] **Step 2: Update stores barrel export (index.ts)**

Replace the persistentStore section in `src/lib/stores/index.ts`:

```typescript
// Settings (Svelte 5 runes)
export {
  aiSettings,
  editorSettings,
  getSessionId,
  getUserId,
  setUserId,
  uiSettings,
  type AISettings,
  type EditorSettings,
  type UISettings
} from './settings.svelte';
```

- [ ] **Step 3: Build check**

Run: `pnpm build 2>&1 | tail -20`

Fix any import errors that surface.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: migrate all components to Svelte 5 rune stores"
```

---

### Task 8: Redesign PrimarySidebar (Linear/Notion Style)

**Files:**
- Modify: `src/lib/components/sidebars/PrimarySidebar.svelte`

- [ ] **Step 1: Rewrite PrimarySidebar with new styling and rune stores**

Key visual changes to apply:
- Section headers: more vertical padding (py-3), font-medium, tracking-wide, `text-muted-foreground/70`
- File items: `rounded-lg` (8px), `py-2.5 px-3`, subtle hover `bg-muted/20`
- Active file: 2px left accent bar via `border-l-2 border-primary` + `bg-primary/5`
- Folder icons: `FolderOpen` when expanded (filled amber), `Folder` when collapsed (outline)
- Timestamps: `text-[10px] text-muted-foreground/40`
- Action buttons: `size-7` touch targets
- More whitespace: `gap-1` between tree items
- Delete confirmation: softer `bg-destructive/5 border border-destructive/20`
- Drag opacity: `opacity-60` (was `opacity-40`)
- Empty state: `text-muted-foreground/50`, smaller icon

Sync footer changes:
- Replace the simple dot + text with a multi-state component
- Read from `autosave.saveStatus`, `autosave.errorMessage`, `autosave.pendingChanges`, `kv.hasPending`
- States: synced (green dot), pending (amber pulse), saving (spinner), error (error msg + retry)
- Use `transition-all duration-200` for height changes

Store usage changes (from Task 7 mapping):
- Replace `$fileSystemStore.files` with `fileSystem.files`
- Replace `$fileSystemStore.currentFile` with `fileSystem.currentFile`
- Replace `$autosaveStore.pendingChanges` with `autosave.pendingChanges`
- Replace `autosaveStore.saveNow()` with `autosave.saveNow()`
- Replace all `fileSystemStore.*` calls with `fileSystem.*`

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/sidebars/PrimarySidebar.svelte
git commit -m "feat: redesign sidebar with Linear/Notion style and rune store integration"
```

---

### Task 9: Update DocumentPanel

**Files:**
- Modify: `src/lib/components/panels/DocumentPanel.svelte`

- [ ] **Step 1: Update DocumentPanel to use unified file model**

Key changes:
- Replace `import { fileAuxStore, fileSystemStore }` with `import { fileSystem } from '$lib/stores/fileSystem.svelte'`
- Replace `fileSystemStore.subscribe()` with `$effect` watching `fileSystem.currentFile`
- `loadMarkdown()` reads `fileSystem.currentFile?.document` instead of `fileAuxStore.load(id)`
- `saveMarkdown()` calls `fileSystem.updateFile(fileId, { document: content })` instead of `fileAuxStore.save(id, { markdown })`
- Remove `unsubFile` cleanup (no more manual subscription)

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/panels/DocumentPanel.svelte
git commit -m "refactor: DocumentPanel uses unified file model for markdown"
```

---

### Task 10: Delete Old Store Files & Build Verify

**Files:**
- Delete: `src/lib/stores/fileSystem.ts`
- Delete: `src/lib/stores/autosave.ts`
- Delete: `src/lib/stores/kvStore.ts`
- Delete: `src/lib/stores/persistentStore.ts`

- [ ] **Step 1: Delete old stores**

```bash
rm src/lib/stores/fileSystem.ts
rm src/lib/stores/autosave.ts
rm src/lib/stores/kvStore.ts
rm src/lib/stores/persistentStore.ts
```

- [ ] **Step 2: Search for any remaining imports of old stores**

```bash
grep -r "from '\$lib/stores/kvStore'" src/ --include="*.ts" --include="*.svelte"
grep -r "from '\$lib/stores/fileSystem'" src/ --include="*.ts" --include="*.svelte"
grep -r "from '\$lib/stores/autosave'" src/ --include="*.ts" --include="*.svelte"
grep -r "from '\$lib/stores/persistentStore'" src/ --include="*.ts" --include="*.svelte"
```

Fix any remaining references.

- [ ] **Step 3: Full build**

Run: `pnpm build 2>&1 | tail -30`

Expected: Vite compilation succeeds (Vercel adapter Node version error is ok).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old writable-based store files, build verified"
```
