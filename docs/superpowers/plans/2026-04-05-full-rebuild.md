# Graphini Full Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Graphini codebase: remove dead code, migrate auth to magnova-auth, add homepage + dashboard from graphini2, split bloated files, migrate stores to Svelte 5 runes, reorganize into feature-based architecture, upgrade dependencies.

**Architecture:** SvelteKit app with Drizzle ORM on Neon Postgres. Auth via external magnova-auth service (cookie-based). Feature-based folder structure with domain-split DB adapter. All stores use Svelte 5 runes ($state).

**Tech Stack:** SvelteKit, Svelte 5 runes, Drizzle ORM, Neon Postgres, Tailwind CSS, Vercel AI SDK v3/v4, lucide-svelte

**Source references:**
- Graphini (current): `/Users/omkarbhad/Downloads/graphini`
- Graphini2 (source for homepage/dashboard): `/Users/omkarbhad/Workspace/Code/graphini2`
- Design spec: `docs/superpowers/specs/2026-04-05-full-rebuild-design.md`

---

## Phase 1: Dead Code Removal

### Task 1: Delete orphaned legacy files

**Files:**
- Delete: `src/lib/server/db-legacy.ts` (616 lines, 0 imports)
- Delete: `src/lib/server/cache-legacy.ts` (550 lines, 0 imports)
- Delete: `src/lib/server/db/supabase-adapter.ts` (890 lines, 0 imports)
- Delete: `src/lib/stores/aiSettings.ts` (79 lines, 0 imports)

- [ ] **Step 1: Delete the files**

```bash
rm src/lib/server/db-legacy.ts
rm src/lib/server/cache-legacy.ts
rm src/lib/server/db/supabase-adapter.ts
rm src/lib/stores/aiSettings.ts
```

- [ ] **Step 2: Verify nothing breaks**

```bash
pnpm check
```

Expected: Clean pass. These files have zero imports.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: delete orphaned legacy files (db-legacy, cache-legacy, supabase-adapter, aiSettings)"
```

---

### Task 2: Clean barrel exports and supabase stub

**Files:**
- Modify: `src/lib/stores/index.ts` — remove aiSettingsStore re-exports
- Modify: `src/lib/components/common/UserLoginCircle.svelte` — replace supabase import with authStore
- Delete: `src/lib/supabase.ts`

- [ ] **Step 1: Remove legacy exports from stores/index.ts**

Open `src/lib/stores/index.ts`. Remove any re-exports referencing `aiSettings.ts` (e.g., `legacyAiSettingsStore`, `maxTokens`, `promptMode`, `selectedModelId`, `temperature` if they came from aiSettings).

- [ ] **Step 2: Fix UserLoginCircle.svelte**

Replace `import { supabase } from '$lib/supabase'` with `import { authStore } from '$lib/stores/auth.svelte'`. Replace supabase.auth calls with authStore methods (login, logout, user getter). The component shows user avatar + sign in/out — wire it to authStore.isLoggedIn, authStore.user, authStore.login(), authStore.logout().

- [ ] **Step 3: Delete supabase stub**

```bash
rm src/lib/supabase.ts
```

- [ ] **Step 4: Verify and commit**

```bash
pnpm check
git add -A && git commit -m "chore: clean barrel exports, remove supabase stub"
```

---

## Phase 2: Auth Migration

### Task 3: Replace server auth module with magnova-auth

**Files:**
- Rewrite: `src/lib/server/auth/index.ts`

- [ ] **Step 1: Read current auth module**

Read `src/lib/server/auth/index.ts` to understand current exports: register, login, logout, validateSession, hashPassword, verifyPassword, extractToken, createSessionCookie, clearSessionCookie.

- [ ] **Step 2: Replace with magnova-auth pattern**

Rewrite the file. New exports:
- `validateSession(request: Request): Promise<User | null>` — reads `magnova_session` cookie, verifies HMAC signature, looks up user by Firebase UID
- `getAuthUrl(returnTo?: string): string` — returns `${MAGNOVA_AUTH_URL}/graphini?redirect=returnTo`
- `getSignoutUrl(redirectTo?: string): string` — returns magnova-auth signout URL
- `signValue(value: string): Promise<string>` — HMAC-SHA256 signing
- `verifySignedValue(signedValue: string): Promise<string | null>` — verify + extract

Port from graphini2's `src/lib/server/auth/index.ts` — it has the exact implementation needed. Adapt imports to match graphini's DB/cache module paths.

- [ ] **Step 3: Verify compile**

```bash
pnpm check
```

Fix any import errors (getCache, getDb, User type paths may differ).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: replace server auth with magnova-auth cookie validation"
```

---

### Task 4: Rewrite auth API routes

**Files:**
- Rewrite: `src/routes/api/auth/me/+server.ts`
- Rewrite: `src/routes/api/auth/login/+server.ts`
- Rewrite: `src/routes/api/auth/logout/+server.ts`
- Delete: `src/routes/api/auth/register/+server.ts`

- [ ] **Step 1: Rewrite /api/auth/me**

GET handler: call `validateSession(request)` from new auth module. Return user JSON or 401.

- [ ] **Step 2: Rewrite /api/auth/login**

Change from POST (email/password) to GET. Import `getAuthUrl`. Read `returnTo` from query params. Return redirect(302) to getAuthUrl(returnTo).

- [ ] **Step 3: Rewrite /api/auth/logout**

Change from POST to GET. Import `getSignoutUrl`. Return redirect(302) to getSignoutUrl().

- [ ] **Step 4: Delete register route**

```bash
rm -rf src/routes/api/auth/register
```

- [ ] **Step 5: Verify and commit**

```bash
pnpm check
git add -A && git commit -m "feat: rewrite auth API routes for magnova-auth"
```

---

### Task 5: Rewrite auth.svelte.ts client store

**Files:**
- Modify: `src/lib/stores/auth.svelte.ts`

- [ ] **Step 1: Read current store**

Current has: login(email, password), register(email, password, name), fetchMe(), logout(), refreshCredits().

- [ ] **Step 2: Rewrite login/register/logout**

- `login(returnTo?)`: fetch `/api/auth/login?returnTo=...` then `window.location.href = response redirect URL` (or just set window.location.href directly to the auth URL)
- Remove `register()` entirely
- `logout()`: clear local state + localStorage cache, then `window.location.href = '/api/auth/logout'`
- Keep `fetchMe()`, `refreshCredits()`, `init()` as-is (they call /api/auth/me which still works)
- Keep all getters: user, credits, isLoggedIn, isLoading, isInitialized

- [ ] **Step 3: Verify and commit**

```bash
pnpm check
git add -A && git commit -m "feat: update auth store for magnova-auth (redirect-based login)"
```

---

### Task 6: Replace AuthModal with auth redirect guard

**Files:**
- Modify: `src/routes/edit/+page.svelte`
- Delete: `src/lib/components/AuthModal.svelte`

- [ ] **Step 1: Update edit page**

In `src/routes/edit/+page.svelte`:
- Remove `import AuthModal` and its usage in the template
- Add auth guard in onMount: if `!authStore.isLoggedIn && authStore.isInitialized`, redirect to login

- [ ] **Step 2: Delete AuthModal**

```bash
rm src/lib/components/AuthModal.svelte
```

- [ ] **Step 3: Verify and commit**

```bash
pnpm check
git add -A && git commit -m "feat: replace AuthModal with redirect-based auth guard"
```

---

### Task 7: Update .env.example and layout

**Files:**
- Modify: `.env.example`
- Verify: `src/routes/+layout.svelte`

- [ ] **Step 1: Add new env vars to .env.example**

Add:
```
MAGNOVA_AUTH_URL=https://auth.magnova.ai
COOKIE_SECRET=
ANTHROPIC_API_KEY=
```

- [ ] **Step 2: Verify layout auth init**

Read `src/routes/+layout.svelte`. The `authStore.init()` call should still work since it calls `fetchMe()` → `/api/auth/me` → now proxies to magnova-auth. No change needed unless init() references removed methods.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: add magnova-auth env vars, verify layout auth init"
```

---

## Phase 3: Dashboard + Workspace System

### Task 8: Create workspace types

**Files:**
- Create: `src/lib/types/workspace.ts`

- [ ] **Step 1: Port workspace types from graphini2**

Copy from `/Users/omkarbhad/Workspace/Code/graphini2/src/lib/types/workspace.ts`. Defines: CanvasViewport, CanvasElement, CanvasConnection, WorkspaceDocument, WorkspaceChatMessage, DiagramWorkspace, DiagramWorkspaceSummary, DEFAULT_WORKSPACE_DOCUMENT.

- [ ] **Step 2: Verify compile and commit**

```bash
pnpm check
git add -A && git commit -m "feat: add workspace type definitions"
```

---

### Task 9: Create design tokens

**Files:**
- Create: `src/lib/design-tokens.ts`

- [ ] **Step 1: Port design tokens from graphini2**

Copy from `/Users/omkarbhad/Workspace/Code/graphini2/src/lib/design-tokens.ts`. Contains WORKSPACE_CATEGORIES, canvas colors, stroke/fill palettes, grid patterns, font stacks, brand gradient.

- [ ] **Step 2: Verify compile and commit**

```bash
pnpm check
git add -A && git commit -m "feat: add design tokens (workspace categories, colors, fonts)"
```

---

### Task 10: Add workspace DB schema + adapter methods

**Files:**
- Modify: `src/lib/server/db/schema.ts`
- Modify: `src/lib/server/db/adapter.ts`
- Modify: `src/lib/server/db/neon-adapter.ts`

- [ ] **Step 1: Add workspaces table to schema.ts**

Add Drizzle table definition for `workspaces` (id, user_id, title, description, diagram_type, is_starred, tags, document JSONB, element_count, thumbnail_url, created_at, updated_at). Check if it already exists — the adapter.ts interface already mentions workspace methods.

- [ ] **Step 2: Add/verify workspace methods in adapter.ts**

Ensure the DatabaseAdapter interface has: createWorkspace, getWorkspace, listWorkspaces, updateWorkspace, deleteWorkspace, updateWorkspaceDocument, duplicateWorkspace.

- [ ] **Step 3: Implement in neon-adapter.ts**

Add the workspace method implementations using Drizzle queries against the workspaces table.

- [ ] **Step 4: Verify and commit**

```bash
pnpm check
git add -A && git commit -m "feat: add workspace DB schema and adapter methods"
```

---

### Task 11: Create workspace API routes

**Files:**
- Create: `src/routes/api/workspaces/+server.ts`
- Create: `src/routes/api/workspaces/[id]/+server.ts`
- Create: `src/routes/api/workspaces/[id]/document/+server.ts`
- Create: `src/routes/api/workspaces/[id]/duplicate/+server.ts`

- [ ] **Step 1: Port workspace API routes from graphini2**

Port from graphini2's `src/routes/api/workspaces/` directory. Adapt imports to graphini's auth (validateSession), DB (getDb), and rate limiting modules. Each route:
- GET/POST /api/workspaces — list + create
- GET/PATCH/DELETE /api/workspaces/[id] — CRUD
- PUT /api/workspaces/[id]/document — save document
- POST /api/workspaces/[id]/duplicate — duplicate

- [ ] **Step 2: Verify and commit**

```bash
pnpm check
git add -A && git commit -m "feat: add workspace API routes"
```

---

### Task 12: Create workspace store

**Files:**
- Create: `src/lib/stores/workspace.svelte.ts`

- [ ] **Step 1: Port workspace store from graphini2**

Copy from `/Users/omkarbhad/Workspace/Code/graphini2/src/lib/stores/workspace.svelte.ts`. Uses $state runes. Exports workspaceStore with: load, save, markDirty, unload, create, delete, duplicate, toggleStar, list, updateMeta, addChatMessage. Adapt imports (documentMarkdownStore, inputStateStore paths).

- [ ] **Step 2: Export from stores/index.ts**

Add `export { workspaceStore } from './workspace.svelte';` to stores barrel.

- [ ] **Step 3: Verify and commit**

```bash
pnpm check
git add -A && git commit -m "feat: add workspace store (Svelte 5 runes)"
```

---

### Task 13: Create dashboard page

**Files:**
- Create: `src/routes/dashboard/+page.svelte`

- [ ] **Step 1: Port dashboard from graphini2**

Copy from `/Users/omkarbhad/Workspace/Code/graphini2/src/routes/dashboard/+page.svelte`. Workspace grid with cards, sidebar filters (All/Starred/Shared), search with Cmd+K, create/duplicate/delete/star actions. Adapt imports to graphini's paths.

- [ ] **Step 2: Verify and commit**

```bash
pnpm check
git add -A && git commit -m "feat: add dashboard page with workspace grid"
```

---

### Task 14: Create workspace loader page

**Files:**
- Create: `src/routes/workspace/[id]/+page.svelte`

- [ ] **Step 1: Port workspace loader from graphini2**

Copy from `/Users/omkarbhad/Workspace/Code/graphini2/src/routes/workspace/[id]/+page.svelte`. Loads workspace by ID on mount, redirects to /edit on success, shows error on failure.

- [ ] **Step 2: Verify and commit**

```bash
pnpm check
git add -A && git commit -m "feat: add workspace loader route"
```

---

### Task 15: Migrate edit page to workspace system + remove filesystem

**Files:**
- Modify: `src/routes/edit/+page.svelte`
- Modify: `src/lib/components/sidebars/PrimarySidebar.svelte`
- Modify: `src/lib/features/chat/components/Chat.simple.svelte`
- Modify: `src/lib/components/toolbar/LeftToolbar.svelte`
- Modify: `src/lib/components/panels/DocumentPanel.svelte`
- Modify: `src/lib/stores/autosave.svelte.ts`
- Modify: `src/lib/stores/index.ts`
- Delete: `src/lib/features/filesystem/` (entire directory)
- Delete: `src/lib/stores/fileSystem.svelte.ts`
- Delete: `src/lib/stores/sessionFiles.svelte.ts`
- Delete: `src/lib/server/file-store.ts` (if exists)
- Delete: `src/routes/api/user/files/` (entire directory)
- Delete: `src/routes/api/files/+server.ts`

- [ ] **Step 1: Update edit page**

Replace `fileSystem` and `type UserFile` imports with `workspaceStore`. The edit page should load workspace from workspaceStore.workspace (already loaded by /workspace/[id] redirect). Replace file save logic with workspaceStore.markDirty().

- [ ] **Step 2: Update dependent components**

For each file that imports fileSystem/sessionFiles:
- PrimarySidebar: remove file list, simplify or add workspace info
- Chat.simple: replace file context with workspaceStore.workspace
- LeftToolbar: replace file operations with workspace operations
- DocumentPanel: replace file content with workspace document
- autosave.svelte.ts: replace file autosave with workspaceStore.save()

- [ ] **Step 3: Remove filesystem code**

```bash
rm -rf src/lib/features/filesystem
rm src/lib/stores/fileSystem.svelte.ts
rm src/lib/stores/sessionFiles.svelte.ts
rm -f src/lib/server/file-store.ts
rm -rf src/routes/api/user/files
rm -f src/routes/api/files/+server.ts
```

- [ ] **Step 4: Update stores/index.ts**

Remove fileSystem and sessionFiles exports.

- [ ] **Step 5: Verify and commit**

```bash
pnpm check
git add -A && git commit -m "feat: migrate edit page to workspace system, remove filesystem"
```

---

## Phase 4: Homepage

### Task 16: Create Header and HeroSection components

**Files:**
- Create: `src/lib/components/ui/header/header.svelte`
- Create: `src/lib/components/ui/header/index.ts`
- Create: `src/lib/components/ui/hero-section/hero-section.svelte`
- Create: `src/lib/components/ui/hero-section/index.ts`

- [ ] **Step 1: Port Header from graphini2**

Copy from `/Users/omkarbhad/Workspace/Code/graphini2/src/lib/components/ui/header/`. Responsive sticky header with nav links, auth-aware buttons, mobile menu.

- [ ] **Step 2: Port HeroSection from graphini2**

Copy from `/Users/omkarbhad/Workspace/Code/graphini2/src/lib/components/ui/hero-section/`. Animated hero with gradient, CTA buttons.

- [ ] **Step 3: Verify and commit**

```bash
pnpm check
git add -A && git commit -m "feat: add Header and HeroSection components"
```

---

### Task 17: Replace homepage

**Files:**
- Rewrite: `src/routes/+page.svelte`

- [ ] **Step 1: Replace with graphini2's homepage**

Copy from `/Users/omkarbhad/Workspace/Code/graphini2/src/routes/+page.svelte` (468 lines). Marketing page with: Header, HeroSection, prompt chips, diagram type marquee, features grid, how-it-works, built-with, CTA, footer. Adapt any import paths.

- [ ] **Step 2: Verify and commit**

```bash
pnpm check
git add -A && git commit -m "feat: replace homepage with marketing landing page"
```

---

### Task 18: Update app.css

**Files:**
- Modify: `src/app.css`

- [ ] **Step 1: Merge graphini2's CSS additions**

Compare graphini2's `src/app.css` with graphini's. Add:
- Typography: DM Sans, Space Grotesk, JetBrains Mono font imports
- Canvas design tokens (--canvas-accent, --canvas-sticky, etc.)
- Film grain overlay
- prefers-reduced-motion accessibility queries
- Mermaid styling updates (1.5px stroke, 8px radius)
- Homepage-specific styles: btn-primary, btn-glass, prompt-chip, surface-chip, section-heading, feature-card, tech-chip, footer styles, marquee animation

Don't remove existing styles — merge additive.

- [ ] **Step 2: Verify and commit**

```bash
pnpm check
git add -A && git commit -m "feat: update app.css with graphini2 typography, tokens, and homepage styles"
```

---

## Phase 5: Split Bloated Files

### Task 19: Split neon-adapter.ts into domain helpers

**Files:**
- Modify: `src/lib/server/db/neon-adapter.ts` (1229 lines → ~100 lines)
- Create: `src/lib/server/db/domains/users.ts`
- Create: `src/lib/server/db/domains/conversations.ts`
- Create: `src/lib/server/db/domains/models.ts`
- Create: `src/lib/server/db/domains/cache.ts`
- Create: `src/lib/server/db/domains/credits.ts`
- Create: `src/lib/server/db/domains/workspaces.ts`

- [ ] **Step 1: Read neon-adapter.ts and identify method groups**

Group methods by domain. Each domain helper exports plain functions that take a `db` (Drizzle instance) parameter.

- [ ] **Step 2: Extract domain files one at a time**

For each domain: create file, move functions, update neon-adapter.ts to import + delegate. Test after each extraction.

- [ ] **Step 3: Verify NeonAdapter still implements full DatabaseAdapter interface**

```bash
pnpm check
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "refactor: split neon-adapter into domain helpers (users, conversations, models, cache, credits, workspaces)"
```

---

### Task 20: Split mermaid.ts into feature modules

**Files:**
- Modify: `src/lib/features/diagram/mermaid.ts` (1213 lines → re-export barrel)
- Create: `src/lib/features/diagram/mermaid-parser.ts`
- Create: `src/lib/features/diagram/mermaid-renderer.ts`
- Modify: `src/lib/features/diagram/mermaidThemes.ts` (absorb theme logic)

- [ ] **Step 1: Read mermaid.ts and identify logical groups**

- Parser: syntax detection, validation, diagram type identification
- Renderer: SVG rendering, DOM manipulation, label fixing, pan/zoom
- Themes: color application, dark mode fixes, icon monochrome detection

- [ ] **Step 2: Extract parser and renderer**

Move functions to respective files. mermaid.ts re-exports everything.

- [ ] **Step 3: Verify all importers still work**

4 files import from mermaid.ts — verify they still resolve.

```bash
pnpm check
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "refactor: split mermaid.ts into parser, renderer, and theme modules"
```

---

### Task 21: Organize schema.ts with section comments

**Files:**
- Modify: `src/lib/server/db/schema.ts`

- [ ] **Step 1: Add section comments**

Reorganize table definitions under clear section headers:
```
// === USERS & AUTH ===
// === WORKSPACES ===
// === CONVERSATIONS & MESSAGES ===
// === CREDITS ===
// === CACHE & KV ===
```

No functional changes — just reorder and add comments.

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "chore: organize schema.ts with domain section comments"
```

---

## Phase 6: Store Migration to Svelte 5 Runes

### Task 22: Migrate modelStore.ts

**Files:**
- Rewrite: `src/lib/stores/modelStore.ts` → `src/lib/stores/modelStore.svelte.ts`

- [ ] **Step 1: Read current modelStore.ts**

Uses Svelte writable stores: allModelsStore, favoriteModelsStore, selectedChatModelsStore, modelsLoadingStore. Functions: loadModelsFromAPI, toggleFavoriteModel, etc.

- [ ] **Step 2: Rewrite using $state runes**

Follow the pattern from auth.svelte.ts: `let state = $state<...>(...)`, export object with getters and methods.

- [ ] **Step 3: Update all imports**

Grep for `from.*modelStore` and update import paths (add .svelte to the path). Update stores/index.ts.

- [ ] **Step 4: Delete old file, verify, commit**

```bash
rm src/lib/stores/modelStore.ts
pnpm check
git add -A && git commit -m "refactor: migrate modelStore to Svelte 5 runes"
```

---

### Task 23: Migrate toolsStore.ts

**Files:**
- Rewrite: `src/lib/stores/toolsStore.ts` → `src/lib/stores/toolsStore.svelte.ts`

- [ ] **Step 1: Read, rewrite with $state runes, update imports, delete old, verify, commit**

Same pattern as Task 22.

```bash
rm src/lib/stores/toolsStore.ts
pnpm check
git add -A && git commit -m "refactor: migrate toolsStore to Svelte 5 runes"
```

---

### Task 24: Migrate documentStore.ts

**Files:**
- Rewrite: `src/lib/stores/documentStore.ts` → `src/lib/stores/documentStore.svelte.ts`

- [ ] **Step 1: Read, rewrite, update imports, delete old, verify, commit**

Tiny file (9 lines) — single writable store → single $state.

```bash
rm src/lib/stores/documentStore.ts
pnpm check
git add -A && git commit -m "refactor: migrate documentStore to Svelte 5 runes"
```

---

### Task 25: Migrate diagram-theme.ts + rename

**Files:**
- Rewrite: `src/lib/stores/diagram-theme.ts` → `src/lib/stores/diagramTheme.svelte.ts`

- [ ] **Step 1: Read, rewrite with $state runes, rename to camelCase**

Has: currentTheme, selectedPreset, customColors writables + derived theme store. Convert all to $state + $derived.

- [ ] **Step 2: Update all imports (grep for diagram-theme), delete old, verify, commit**

```bash
rm src/lib/stores/diagram-theme.ts
pnpm check
git add -A && git commit -m "refactor: migrate diagram-theme to diagramTheme.svelte.ts with runes"
```

---

### Task 26: Migrate theme.ts

**Files:**
- Rewrite: `src/lib/stores/theme.ts` → `src/lib/stores/theme.svelte.ts`

- [ ] **Step 1: Read, rewrite, update imports, delete old, verify, commit**

Tiny file (7 lines) — re-exports `mode` from mode-watcher.

```bash
rm src/lib/stores/theme.ts
pnpm check
git add -A && git commit -m "refactor: migrate theme to Svelte 5 runes"
```

---

## Phase 7: Feature-Based Architecture

### Task 27: Move editor components to features/editor/

**Files:**
- Move: `src/lib/components/editor/*.svelte` → `src/lib/features/editor/components/`
- Move: `src/lib/components/editor/index.ts` → `src/lib/features/editor/components/index.ts`

- [ ] **Step 1: Create directory and move files**

```bash
mkdir -p src/lib/features/editor/components
mv src/lib/components/editor/Editor.svelte src/lib/features/editor/components/
mv src/lib/components/editor/DesktopEditor.svelte src/lib/features/editor/components/
mv src/lib/components/editor/MobileEditor.svelte src/lib/features/editor/components/
mv src/lib/components/editor/index.ts src/lib/features/editor/components/
rmdir src/lib/components/editor
```

- [ ] **Step 2: Create feature index**

Create `src/lib/features/editor/index.ts` that re-exports from components.

- [ ] **Step 3: Update all imports**

Grep for `components/editor` and update to `features/editor/components` (or `features/editor`).

- [ ] **Step 4: Verify and commit**

```bash
pnpm check
git add -A && git commit -m "refactor: move editor components to features/editor/"
```

---

### Task 28: Move diagram Svelte components into components/ subfolder

**Files:**
- Move diagram .svelte files in `src/lib/features/diagram/` into `src/lib/features/diagram/components/`

- [ ] **Step 1: Move Svelte components**

```bash
mkdir -p src/lib/features/diagram/components
mv src/lib/features/diagram/Share.svelte src/lib/features/diagram/components/
mv src/lib/features/diagram/Preset.svelte src/lib/features/diagram/components/
mv src/lib/features/diagram/Actions.svelte src/lib/features/diagram/components/
mv src/lib/features/diagram/DiagramDocumentationButton.svelte src/lib/features/diagram/components/
```

- [ ] **Step 2: Update imports, verify, commit**

```bash
pnpm check
git add -A && git commit -m "refactor: organize diagram feature with components/ subfolder"
```

---

## Phase 8: Util Reorganization

### Task 29: Create util subdirectories and move files

**Files:**
- Move various files in `src/lib/util/` into subdirectories

- [ ] **Step 1: Create subdirectories and move**

```bash
mkdir -p src/lib/util/{diagram,editor,state,serialization,error}
mv src/lib/util/diagramMapper.ts src/lib/util/diagram/
mv src/lib/util/monacoExtra.ts src/lib/util/editor/
mv src/lib/util/state.ts src/lib/util/state/
mv src/lib/util/persist.ts src/lib/util/state/
mv src/lib/util/migrations.ts src/lib/util/state/
mv src/lib/util/migrations.test.ts src/lib/util/state/
mv src/lib/util/serde.ts src/lib/util/serialization/
mv src/lib/util/serde.test.ts src/lib/util/serialization/
mv src/lib/util/exportState.ts src/lib/util/serialization/
mv src/lib/util/errorHandling.ts src/lib/util/error/
mv src/lib/util/errorToString.ts src/lib/util/error/
```

- [ ] **Step 2: Update util/index.ts barrel**

Rewrite to re-export from new paths.

- [ ] **Step 3: Update ALL imports across codebase**

Grep for every moved file and update import paths.

- [ ] **Step 4: Verify and commit**

```bash
pnpm check
git add -A && git commit -m "refactor: reorganize util/ into domain subdirectories"
```

---

### Task 30: Extract url.ts from state.ts

**Files:**
- Modify: `src/lib/util/state/state.ts`
- Create: `src/lib/util/state/url.ts`

- [ ] **Step 1: Read state.ts, identify URL-related functions**

Extract URL parsing, query param handling, and serialization-to-URL functions into url.ts.

- [ ] **Step 2: Update imports, verify, commit**

```bash
pnpm check
git add -A && git commit -m "refactor: extract URL utilities from state.ts"
```

---

### Task 31: Extract mermaidHelpers.ts from monacoExtra.ts

**Files:**
- Modify: `src/lib/util/editor/monacoExtra.ts`
- Create: `src/lib/util/diagram/mermaidHelpers.ts`

- [ ] **Step 1: Read monacoExtra.ts (673 lines)**

Identify Mermaid keyword definitions and language tokens (~300 lines) that can be extracted.

- [ ] **Step 2: Extract to mermaidHelpers.ts, update imports, verify, commit**

```bash
pnpm check
git add -A && git commit -m "refactor: extract Mermaid language helpers from monacoExtra"
```

---

## Phase 9: Config & Infrastructure

### Task 32: Add logger and rate-limit

**Files:**
- Create: `src/lib/server/logger.ts`
- Create: `src/lib/server/rate-limit.ts`

- [ ] **Step 1: Port logger from graphini2**

Copy from `/Users/omkarbhad/Workspace/Code/graphini2/src/lib/server/logger.ts`. Simple structured logger with level-based filtering.

- [ ] **Step 2: Port rate-limit from graphini2**

Copy from `/Users/omkarbhad/Workspace/Code/graphini2/src/lib/server/rate-limit.ts`. Sliding window limiter with pre-configured instances (chat, upload, api, auth).

- [ ] **Step 3: Verify and commit**

```bash
pnpm check
git add -A && git commit -m "feat: add structured logger and rate limiter"
```

---

### Task 33: Upgrade dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update package.json**

- Rename `"name"` to `"graphini"`
- Upgrade: `@ai-sdk/openai` to `^3.0.27`
- Upgrade: `@ai-sdk/svelte` to `^4.0.83`
- Add: `@ai-sdk/anthropic` `^3.0.64`
- Upgrade: `ai` to `^6.0.83`
- Remove: `@supabase/supabase-js`

- [ ] **Step 2: Install and fix breaking changes**

```bash
pnpm install
pnpm check
```

AI SDK v3/v4 may have breaking API changes. Fix any compile errors in chat/diagram API routes that use the AI SDK.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: upgrade AI SDK to v3/v4, add Anthropic, remove Supabase"
```

---

### Task 34: Update config files

**Files:**
- Modify: `vite.config.js`
- Modify: `eslint.config.js`
- Modify: `playwright.config.ts`
- Modify: `.gitignore`
- Modify: `.env.example`

- [ ] **Step 1: Update vite.config.js**

Update test config: include `src/**/*.{test,spec}.{js,ts}` and `tests/unit/**/*`, exclude `tests/e2e/**/*`, setupFiles `./tests/unit/setup.ts`.

- [ ] **Step 2: Update eslint.config.js**

Add `'svelte/no-navigation-without-resolve': 'off'` to svelte rules.

- [ ] **Step 3: Update playwright.config.ts**

Change `testDir` to `'./tests/e2e'`.

- [ ] **Step 4: Update .gitignore**

Remove Python/C++ backend rules. Add `*.db`.

- [ ] **Step 5: Verify and commit**

```bash
pnpm check
git add -A && git commit -m "chore: update config files (vite, eslint, playwright, gitignore)"
```

---

### Task 35: Restructure tests + clean root files

**Files:**
- Move: `src/tests/setup.ts` → `tests/unit/setup.ts`
- Delete: `archived/`, `CNAME`, `excalifile.json`
- Move: `DOCUMENTATION.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` → `docs/`
- Copy: `static/favicon.svg` from graphini2

- [ ] **Step 1: Restructure tests**

```bash
mkdir -p tests/unit tests/e2e
mv src/tests/setup.ts tests/unit/setup.ts
rmdir src/tests 2>/dev/null || true
```

- [ ] **Step 2: Clean root files**

```bash
rm -rf archived
rm -f CNAME excalifile.json
mv DOCUMENTATION.md docs/ 2>/dev/null || true
mv CODE_OF_CONDUCT.md docs/ 2>/dev/null || true
mv SECURITY.md docs/ 2>/dev/null || true
cp /Users/omkarbhad/Workspace/Code/graphini2/static/favicon.svg static/
```

- [ ] **Step 3: Final verification**

```bash
pnpm check
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: restructure tests, clean root files, add favicon"
```

---

## Completion Checklist

- [ ] All legacy files deleted (~2,500 lines)
- [ ] Auth migrated to magnova-auth (cookie-based redirect flow)
- [ ] Homepage replaced with marketing landing page
- [ ] Dashboard + workspace system working
- [ ] Filesystem feature removed
- [ ] neon-adapter.ts split into domain helpers
- [ ] mermaid.ts split into parser/renderer/themes
- [ ] All 5 legacy stores migrated to Svelte 5 runes
- [ ] Editor components moved to features/editor/
- [ ] Utils organized into domain subdirectories
- [ ] Logger + rate limiter added
- [ ] Dependencies upgraded (AI SDK v3/v4, Anthropic added)
- [ ] Config files updated
- [ ] Tests restructured
- [ ] Root files cleaned
- [ ] `pnpm build` passes cleanly
