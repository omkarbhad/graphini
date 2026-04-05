# Graphini Full Rebuild — Design Spec

**Date:** 2026-04-05
**Scope:** Full codebase restructure, auth migration, homepage + dashboard integration, store modernization, dependency upgrades
**Approach:** Aggressive — feature-based architecture, domain-split server code, complete Svelte 5 runes migration

---

## 1. Dead Code Removal

**Delete (~2,500+ lines):**

| File | Lines | Reason |
|------|-------|--------|
| `src/lib/server/db-legacy.ts` | 616 | Replaced by neon-adapter |
| `src/lib/server/cache-legacy.ts` | 550 | Replaced by server/cache/ |
| `src/lib/server/db/supabase-adapter.ts` | 890 | Replaced by neon-adapter |
| `src/lib/supabase.ts` | 16 | Stub, no real usage after auth swap |
| `src/lib/stores/aiSettings.ts` | 79 | 0 imports, replaced by settings.svelte.ts |
| `src/lib/components/AuthModal.svelte` | ~100 | Replaced by magnova-auth redirect |

**Barrel export cleanup:**
- Remove `aiSettingsStore` re-export from `src/lib/stores/index.ts`
- Remove supabase re-exports from `src/lib/index.ts`

---

## 2. Auth Migration to magnova-auth

**Integration model:** API client — graphini calls deployed magnova-auth instance.

**Auth URL:** `https://auth.magnova.ai/graphini`

**Flow:**
1. User clicks "Sign In" -> redirect to `https://auth.magnova.ai/graphini?redirect_to=<graphini-url>`
2. magnova-auth handles Google login, sets `magnova_session` + `magnova_auth` cookies on `.magnova.ai`
3. User redirected back to graphini
4. Graphini validates session by forwarding cookie to magnova-auth's `GET /api/users`

**New server auth module** (`src/lib/server/auth/index.ts`):
```ts
getAuthUrl(returnTo?: string) -> string    // builds magnova-auth login URL
getSignoutUrl() -> string                   // builds magnova-auth signout URL
validateSession(cookies) -> User | null     // forwards cookie to magnova-auth /api/users
```

**Client auth store** — `src/lib/stores/auth.svelte.ts` (update existing):
- `fetchMe()` -> calls `/api/auth/me` (proxies to magnova-auth)
- `login(returnTo?)` -> redirects to magnova-auth
- `logout()` -> clears local state, redirects to magnova-auth signout
- Local storage cache for optimistic UI (`graphini_auth_cache`)
- Exports: `user`, `isLoggedIn`, `credits`, `isLoading`, `isInitialized`

**API routes — keep (rewritten):**
- `GET /api/auth/me` — proxy to magnova-auth, return user
- `GET /api/auth/login` — redirect to magnova-auth login
- `GET /api/auth/logout` — redirect to magnova-auth signout

**API routes — delete:**
- `POST /api/auth/login` (password-based)
- `POST /api/auth/register` (password-based)
- `POST /api/auth/logout` (old)

**Env vars:**
```
MAGNOVA_AUTH_URL=https://auth.magnova.ai/graphini
SESSION_COOKIE_DOMAIN=.magnova.ai
COOKIE_SECRET=<session signing key>
```

---

## 3. Homepage from graphini2

**Copy verbatim** from graphini2's `src/routes/+page.svelte` (~468 lines).

**Components to copy:**
- `Header.svelte` -> `src/lib/components/navigation/Header.svelte`
- `HeroSection.svelte` -> `src/lib/components/marketing/HeroSection.svelte`

**CSS additions from graphini2's `app.css`:**
- Typography: DM Sans + Space Grotesk + JetBrains Mono
- Film grain overlay
- Canvas design tokens (`--canvas-accent`, `--canvas-sticky`, etc.)
- `prefers-reduced-motion` accessibility queries
- Updated color scheme (white bg, #0a0a0a fg)
- Mermaid diagram styling updates (1.5px stroke, 8px radius)

**Edit/canvas pages remain untouched.**

---

## 4. Replace FileSystem with Dashboard + Workspaces

**Remove:**
- `src/lib/features/filesystem/` (entire feature)
- `src/lib/stores/fileSystem.svelte.ts`
- `src/lib/stores/sessionFiles.svelte.ts`
- `src/routes/api/user/files/` (including `versions/`)
- `src/routes/api/files/`
- `src/lib/server/file-store.ts`

**Add from graphini2:**
- `src/routes/dashboard/+page.svelte` — workspace grid (cards, sidebar, search, filters)
- `src/routes/workspace/[id]/+page.svelte` — workspace loader (fetches -> redirects to /edit)
- `src/lib/stores/workspace.svelte.ts` — workspace CRUD, list, search, star, duplicate
- `src/routes/api/workspaces/` — full API:
  - `+server.ts` — GET list, POST create
  - `[id]/+server.ts` — GET, PATCH, DELETE
  - `[id]/document/+server.ts` — PUT document
  - `[id]/duplicate/+server.ts` — POST duplicate
- Workspace types: `DiagramWorkspace`, `DiagramWorkspaceSummary`, `WorkspaceDocument`

**DB schema — add `workspaces` table:**
```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  diagram_type TEXT,
  is_starred BOOLEAN DEFAULT false,
  tags TEXT[],
  document JSONB,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Flow change:**
```
Before: / -> /edit (single diagram, localStorage)
After:  / (marketing) -> /dashboard (workspace grid) -> /workspace/[id] -> /edit
```

---

## 5. Split Bloated Files

### neon-adapter.ts (1,229 lines) -> Domain modules

Split into `src/lib/server/db/domains/`:

| File | Responsibility |
|------|---------------|
| `users.ts` | User CRUD, auth lookups, role management |
| `files.ts` | File storage, versioning |
| `conversations.ts` | Chat conversations, messages |
| `models.ts` | AI model configs, admin model management |
| `cache.ts` | DB-backed cache operations |
| `credits.ts` | Credit balance, transactions, purchases |

`neon-adapter.ts` becomes thin orchestrator (~50 lines) importing from domains.

### mermaid.ts (1,213 lines) -> Feature modules

Split within `src/lib/features/diagram/`:

| File | Responsibility |
|------|---------------|
| `mermaid-parser.ts` | Parsing, syntax detection, validation |
| `mermaid-renderer.ts` | SVG rendering, pan/zoom integration |
| `mermaid-themes.ts` | Already exists — absorb theme logic |

`mermaid.ts` becomes public API re-exporting from these.

### schema.ts (406 lines) -> Domain schemas

Split into `src/lib/server/db/schemas/`:

| File | Tables |
|------|--------|
| `users.ts` | users, sessions |
| `files.ts` | files, file_versions |
| `conversations.ts` | conversations, messages |
| `models.ts` | models, model_configs |
| `cache.ts` | cache_entries |
| `credits.ts` | credits, credit_transactions |

`schema.ts` becomes barrel re-export.

---

## 6. Store Migration to Svelte 5 Runes

### Migrate existing legacy stores

| Old File | New File |
|----------|----------|
| `modelStore.ts` | `modelStore.svelte.ts` |
| `toolsStore.ts` | `toolsStore.svelte.ts` |
| `documentStore.ts` | `documentStore.svelte.ts` |
| `diagram-theme.ts` | `diagramTheme.svelte.ts` (rename to camelCase) |
| `theme.ts` | `theme.svelte.ts` |

### New stores from graphini2

| File | Purpose |
|------|---------|
| `workspace.svelte.ts` | Workspace CRUD, list, search, star, duplicate |
| `canvasDocument.svelte.ts` | Canvas document state |
| `collaboration.svelte.ts` | Real-time collaboration state |

### Rune pattern (matching existing stores like auth.svelte.ts)

```ts
let value = $state<Type>(initial);
export const store = {
  get current() { return value; },
  set(v: Type) { value = v; },
  // domain methods...
};
```

### Delete after migration
All original `.ts` store files replaced by `.svelte.ts` versions.

### Update `stores/index.ts`
Only export rune-based stores. Remove all legacy re-exports.

---

## 7. Feature-Based Architecture

### Move feature-specific components into features

```
features/
  canvas/
    components/    <- ElementToolbar, IconPanel, ColorPanel (from components/canvas/)
    index.ts
  chat/
    components/    <- already here, no change
    index.ts
  diagram/
    components/    <- Share, Preset, Actions, DiagramDocumentationButton
    mermaid-parser.ts
    mermaid-renderer.ts
    mermaid-themes.ts
    panZoom.ts
    index.ts
  editor/
    components/    <- Editor, DesktopEditor, MobileEditor (from components/editor/)
    index.ts
  history/
    (no change)
  icons/
    (no change)
  workspace/       <- NEW (replaces filesystem)
    components/    <- Dashboard cards, sidebar, filters
    index.ts
```

### Keep in components/ (shared across features)

```
components/
  common/          <- CopyButton, FontAwesome, etc.
  cards/           <- Card, Tabs
  layout/          <- View wrapper
  navigation/      <- Navbar, Header, EditNavbar, EditToolbar
  panels/          <- PanelResizeHandle, ChatPanel, DocumentPanel
  toolbar/         <- FloatingToolbar, PanZoomToolbar, LeftToolbar
  sidebars/        <- PrimarySidebar, ColorSidebar
  ui/              <- shadcn primitives
  admin/           <- ModelManager
  marketing/       <- NEW (HeroSection)
  SettingsModal.svelte
  RefillGemsModal.svelte
  Navbar.svelte
```

### Rule
- Component used by one feature -> `features/<name>/components/`
- Component shared across features -> `components/`

---

## 8. Util Reorganization

### Group by domain

```
util/
  diagram/
    diagramMapper.ts
    mermaidHelpers.ts      <- extracted from monacoExtra.ts (~300 lines)
  editor/
    monacoExtra.ts         <- slimmed (~370 lines)
  state/
    state.ts               <- slimmed (~250 lines, core input state)
    url.ts                 <- extracted (~150 lines, URL parsing/query params)
    persist.ts
    migrations.ts
  serialization/
    serde.ts
    serde.test.ts
    exportState.ts
  error/
    errorHandling.ts
    errorToString.ts
  color.ts                 <- stays flat
  stats.ts                 <- stays flat
  util.ts                  <- stays flat
  notify.ts                <- stays flat
  loading.ts               <- stays flat
  env.ts                   <- stays flat
  autoSync.ts              <- stays flat
  promos/                  <- stays
  index.ts                 <- barrel re-exports everything
```

---

## 9. New Server Infrastructure

### Add from graphini2

| File | Purpose |
|------|---------|
| `src/lib/server/logger.ts` | Structured logging — `createLogger(tag)` with debug/info/warn/error, ISO timestamps, `LOG_LEVEL` env var |
| `src/lib/server/rate-limit.ts` | Sliding window rate limiter — `createRateLimiter(name, config)` with `{allowed, retryAfterMs}` |

### Apply rate limiting to
- `/api/workspaces/*`
- `/api/chat`
- `/api/diagram/generate*`

### Apply logger to
- All API routes (replace `console.log`)
- Auth validation
- DB operations

### Dependency upgrades

| Package | Current | Target | Breaking? |
|---------|---------|--------|-----------|
| `@ai-sdk/openai` | 2.0.56 | 3.0.27 | Yes |
| `@ai-sdk/svelte` | 3.0.81 | 4.0.83 | Yes |
| `@ai-sdk/anthropic` | -- | 3.0.64 | New |
| `ai` | 6.0.71 | 6.0.83 | No |
| Remove `@supabase/supabase-js` | -- | -- | -- |

---

## 10. Non-src Files & Config

### Config updates

| File | Action |
|------|--------|
| `package.json` | Rename to `"graphini"`, upgrade deps, add anthropic, remove supabase |
| `.env.example` | Add `MAGNOVA_AUTH_URL`, `ANTHROPIC_API_KEY`, `COOKIE_SECRET`, `KV_*`, `REDIS_URL`, `BLOB_READ_WRITE_TOKEN` |
| `vite.config.js` | Update test includes, setup file -> `./tests/unit/setup.ts` |
| `eslint.config.js` | Add `svelte/no-navigation-without-resolve: 'off'` workaround |
| `playwright.config.ts` | testDir -> `./tests/e2e` |
| `.gitignore` | Remove Python/C++ rules, add `*.db` |
| `drizzle.config.ts` | Keep (needed for DB migrations) |

### Test restructure

```
tests/
  unit/
    setup.ts       <- moved from src/tests/setup.ts
  e2e/
    ...            <- existing playwright tests
```

### Root files to delete

| File | Reason |
|------|--------|
| `archived/` | Dead weight (37 subdirs) |
| `CNAME` | Netlify-specific |
| `excalifile.json` | 460KB artifact |
| `DOCUMENTATION.md` | Move to docs/ |
| `CODE_OF_CONDUCT.md` | Move to docs/ |
| `SECURITY.md` | Move to docs/ |

### Docs structure (from graphini2)

```
docs/
  CHANGELOG.md
  CONTRIBUTING.md
  api/
  design-system/
  superpowers/      <- already exists
```

### Static assets
- Add `favicon.svg` from graphini2

---

## Full Target Directory Structure

```
src/
  lib/
    components/           # Shared UI only
      common/
      cards/
      layout/
      navigation/         # Navbar, Header, EditNavbar, EditToolbar
      panels/
      toolbar/
      sidebars/
      marketing/          # NEW (HeroSection)
      admin/
      ui/                 # shadcn
      SettingsModal.svelte
      RefillGemsModal.svelte
      Navbar.svelte
    features/             # Feature modules (own UI + logic)
      canvas/components/
      chat/components/
      diagram/            # mermaid-parser, renderer, themes
      editor/components/
      history/
      icons/
      workspace/          # NEW (replaces filesystem)
    server/
      auth/               # getAuthUrl, getSignoutUrl, validateSession
      cache/
      db/
        domains/          # users, files, conversations, models, cache, credits
        schemas/          # split by domain
        adapter.ts
        neon-adapter.ts   # thin orchestrator (~50 lines)
        index.ts
      logger.ts           # NEW
      rate-limit.ts       # NEW
      state-manager.ts
    stores/               # All Svelte 5 runes
      auth.svelte.ts
      autosave.svelte.ts
      canvasDocument.svelte.ts    # NEW
      collaboration.svelte.ts     # NEW
      conversations.svelte.ts
      diagramHistory.svelte.ts
      diagramTheme.svelte.ts      # Renamed + migrated
      documentStore.svelte.ts     # Migrated
      kvStore.svelte.ts
      modelStore.svelte.ts        # Migrated
      models.svelte.ts
      panels.svelte.ts
      settings.svelte.ts
      theme.svelte.ts             # Migrated
      toolsStore.svelte.ts        # Migrated
      workspace.svelte.ts         # NEW
      index.ts
    themes/
    util/
      diagram/
      editor/
      state/
      serialization/
      error/
      color.ts
      stats.ts
      util.ts
      notify.ts
      loading.ts
      env.ts
      autoSync.ts
      promos/
      index.ts
    constants.ts
    index.ts
    types.d.ts
    utils.ts
  routes/
    +page.svelte          # Marketing homepage (from graphini2)
    +layout.svelte
    dashboard/            # NEW workspace grid
    workspace/[id]/       # NEW loader -> /edit
    edit/
    view/
    canvas/
    admin/
    api/
      auth/               # me, login redirect, logout redirect
      workspaces/         # NEW
      chat/
      diagram/
      kv/
      models/
      conversations/
      credits/
      admin/
      audio/
      upload/
      collaborators/
      app-settings/
tests/
  unit/
    setup.ts
  e2e/
docs/
  CHANGELOG.md
  CONTRIBUTING.md
  api/
  design-system/
  superpowers/
```

**Total deleted:** ~3,500+ lines of dead code
**Total restructured:** ~5,000+ lines across splits and migrations
