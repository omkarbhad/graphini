# State Management & File System UI Revamp

**Date:** 2026-04-05
**Status:** Approved

## Goal

Modernize all client-side stores to Svelte 5 runes, unify the file model to store both Mermaid diagram and markdown document together, move file versioning to Neon DB, and redesign the file sidebar with Linear/Notion-style aesthetics.

## 1. Unified File Model

Each file stores both a Mermaid diagram and a markdown document as first-class fields. No separate auxiliary store.

```typescript
interface UserFile {
  id: string;           // f-{hex}
  name: string;
  mermaid: string;      // diagram code (was: content)
  document: string;     // markdown content (was: fileAuxStore.markdown)
  userId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  type: 'file' | 'folder';
  parentId: string | null;
}
```

**Migration path:**
- Rename `content` field to `mermaid` throughout
- Pull `markdown` from fileAuxStore into `document` field on the file
- Delete `fileAuxStore` entirely — it becomes dead code
- `fileAuxStore.uiState` and `fileAuxStore.chatMessages` are dropped (unused in practice)

**Consumers that change:**
- CodePanel: reads/writes `currentFile.mermaid` instead of `currentFile.content`
- DocumentPanel: reads/writes `currentFile.document` instead of calling `fileAuxStore.load/save`
- Autosave: saves both fields in one operation
- Chat tools that modify diagrams: update `currentFile.mermaid`

## 2. Store Architecture (Full Svelte 5 Runes)

All stores convert from `writable()` to class-based Svelte 5 runes.

### 2.1 `kvStore.svelte.ts`

Reactive low-level KV store. Replaces `kvStore.ts`.

```typescript
class KvStore {
  initialized = $state(false);
  isAuthenticated = $state(false);
  hasPending = $state(false);
  lastSavedAt = $state<number | null>(null);

  // Methods unchanged: kvGet, kvSet, kvDelete, kvFlush, kvInit, kvReset
  // Internal: memCache Map, localStorage fallback, 1.5s debounced server flush
}

export const kv = new KvStore();
```

UI reads `kv.hasPending` and `kv.lastSavedAt` reactively — no manual listener wiring needed.

### 2.2 `fileSystem.svelte.ts`

Reactive file manager. Replaces `fileSystem.ts` + `fileAuxStore`.

```typescript
class FileSystemManager {
  files = $state<UserFile[]>([]);
  currentFile = $state<UserFile | null>(null);
  isLoading = $state(false);
  error = $state<string | null>(null);
  
  // Auto-derived
  fileTree = $derived.by(() => this.buildTree(this.files));

  // Methods: loadUserFiles, createFile, updateFile, deleteFile,
  //          renameFile, createFolder, moveItem, setCurrentFile,
  //          createVersion, getVersions, forceSyncToDb
  
  // Sync: single 2s debounced timer for DB sync
  // Error: sets this.error on failure, clears on success
}

export const fileSystem = new FileSystemManager();
```

Key changes from current:
- No more `subscribe()()` hack to read current state
- `fileTree` is auto-derived, not manually built by consumers
- Error state is reactive and visible to UI
- `fileAuxStore` absorbed — document field lives on UserFile

### 2.3 `autosave.svelte.ts`

Reactive autosave manager. Replaces `autosave.ts`.

```typescript
class AutosaveManager {
  pendingChanges = $state(false);
  isSaving = $state(false);
  saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
  lastSaved = $state<string | null>(null);
  errorMessage = $state<string | null>(null);
  isEnabled = $state(true);

  // Methods: init, markChanged, saveNow, setCurrentFile, reset
  // Internal: 2s interval timer, reads from inputStateStore for mermaid,
  //           reads currentFile.document for markdown
}

export const autosave = new AutosaveManager();
```

Key changes:
- Direct property reads replace `getCurrentState()` hack
- `errorMessage` field for inline error display
- `saveNow()` saves both mermaid + document

### 2.4 `persistentStore.svelte.ts`

Settings stores as rune-based classes. Replaces `persistentStore.ts`.

```typescript
class PersistentSetting<T> {
  value = $state<T>(defaultValue);
  
  constructor(key: string, defaultValue: T) { /* load from kv */ }
  set(newValue: T): void { /* update + persist */ }
  update(fn: (v: T) => T): void { /* update + persist */ }
  reset(): void { /* reset to default */ }
}

export const uiSettings = new PersistentSetting<UISettings>('ui_settings', defaults);
export const aiSettings = new PersistentSetting<AISettings>('ai_settings', defaults);
export const editorSettings = new PersistentSetting<EditorSettings>('editor_settings', defaults);
```

Remove dead `sync` feature that hits `/api/admin`.
Remove `serialize`/`deserialize` options (unused).
Remove `recentConversationsStore`, `favoritesStore`, `draftMessagesStore` if unused — verify first.

### 2.5 `panels.svelte.ts`

Merge `panelOrderStore` + `panelStore` into one class.

```typescript
class PanelManager {
  panels = $state<Record<PanelId, PanelConfig>>(defaults);
  order = $state<PanelId[]>(DEFAULT_ORDER);

  visiblePanels = $derived(
    this.order.filter(id => this.panels[id].visible).map(id => this.panels[id])
  );

  // Methods: toggle, show, hide, setWidth, reorder, reset
  // Persistence: 150ms debounced kvSet + server prefs sync
}

export const panels = new PanelManager();
```

## 3. File Versions in Neon

New DB table (Drizzle schema + raw SQL push):

```sql
CREATE TABLE file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  content_mermaid TEXT NOT NULL DEFAULT '',
  content_document TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_file_versions_file ON file_versions(file_id, version DESC);
```

- Versions snapshot both `mermaid` and `document` fields together
- Capped at 50 versions per file — auto-prune oldest on insert
- API: `GET /api/user/files/versions?fileId=X` and `POST /api/user/files/versions`
- Created on every autosave (debounced — not on every keystroke)

Remove localStorage-based version storage entirely.

## 4. Sidebar UI (Linear/Notion Style)

### 4.1 Visual Changes

**Spacing & Layout:**
- Section headers: 12px vertical padding, 14px horizontal
- File items: 10px vertical padding, subtle rounded-lg (8px radius)
- More whitespace between sections (8px separator)
- Search input: taller (40px), softer border, larger placeholder text

**Colors & States:**
- Default file item: transparent bg, foreground text
- Hover: `bg-muted/30` (very subtle)
- Active file: soft 2px left accent bar in primary color + `bg-primary/5`
- Folder icons: filled amber when expanded, outline amber when collapsed
- Timestamps: `text-muted-foreground/50`, 10px size

**Section headers:**
- "Files", "Uploads", "Collaborators" — 11px, font-medium, tracking-wide, muted-foreground/70
- Action buttons (new file, new folder) — slightly larger touch targets (28px)

**Delete confirmation:**
- Softer styling: `bg-destructive/5` border instead of harsh red
- Smaller, inline text with check/cancel icons

### 4.2 Sync Status Footer

Replaces the current simple dot + text.

**States:**
- **Synced:** Small green dot (6px) + "Synced" in muted-foreground/60, 11px
- **Pending:** Small amber dot (6px, pulsing) + "Unsaved changes" + "Save" link
- **Saving:** Tiny spinner (12px) + "Saving..." in muted text
- **Error:** Amber dot + error message (truncated, 1 line) + "Retry" button
  - On hover/focus: expands to show full error text
  - Auto-clears after successful retry

**Transitions:** Height changes animate with `transition-all duration-200`.

### 4.3 Interaction Polish

- New file/folder input: slides down with `animate-in` (opacity + translateY)
- Inline rename: same soft primary ring as current, no changes needed
- Drag ghost: 60% opacity on dragged item (current is 40%, too faint)
- Empty state: softer icon (20px), lighter text, "Create a file" button with primary color

## 5. Error Handling Strategy

All sync errors surface through the sidebar footer. No toasts, no modals.

**Error sources:**
- `fileSystem.error` — set on failed file sync, cleared on success
- `kv.hasPending` after flush failure — indicates pending writes that failed
- `autosave.errorMessage` — specific save failure reason

**Display logic in footer:**
```
if (autosave.errorMessage) → show error + retry
else if (autosave.pendingChanges) → show "Unsaved" + save button  
else if (kv.hasPending) → show "Syncing..." with spinner
else → show "Synced" with green dot
```

**Error messages are human-readable:**
- Network failure: "Couldn't reach server"
- Auth expired: "Session expired — please sign in"
- Unknown: "Save failed — click to retry"

## 6. Files Removed / Replaced

- `src/lib/stores/fileSystem.ts` → replaced by `fileSystem.svelte.ts`
- `src/lib/stores/autosave.ts` → replaced by `autosave.svelte.ts`
- `src/lib/stores/kvStore.ts` → replaced by `kvStore.svelte.ts`
- `src/lib/stores/persistentStore.ts` → replaced by `persistentStore.svelte.ts`
- `src/lib/stores/panels.svelte.ts` → rewritten in place (already .svelte.ts)
- `fileAuxStore` (part of fileSystem.ts) → deleted, absorbed into UserFile model

## 7. Migration Checklist

1. Create new store files alongside old ones
2. Update all import paths in components
3. Rename `content` → `mermaid` in UserFile, add `document` field
4. Migrate existing files: `content` becomes `mermaid`, aux markdown becomes `document`
5. Create `file_versions` table in Neon
6. Add version API endpoints
7. Update PrimarySidebar with Linear/Notion styling
8. Update sidebar footer with error states
9. Update DocumentPanel to read/write `currentFile.document`
10. Update CodePanel to read/write `currentFile.mermaid`
11. Remove old store files and fileAuxStore
12. Verify build passes
