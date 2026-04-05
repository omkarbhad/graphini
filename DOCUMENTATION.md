# Graphini — Comprehensive Application Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Authentication & Users](#authentication--users)
6. [Database Layer](#database-layer)
7. [AI Chat System](#ai-chat-system)
8. [Tool System](#tool-system)
9. [File System & Persistence](#file-system--persistence)
10. [Diagram Editor](#diagram-editor)
11. [Markdown Editor](#markdown-editor)
12. [Audio Input](#audio-input)
13. [Admin Panel](#admin-panel)
14. [Models & OpenRouter](#models--openrouter)
15. [Credits / Gems System](#credits--gems-system)
16. [KV Store](#kv-store)
17. [Theming & Dark Mode](#theming--dark-mode)
18. [Deployment](#deployment)
19. [Environment Variables](#environment-variables)

---

## Overview

Graphini is an AI-powered Mermaid diagram editor with an integrated chat assistant, markdown documentation panel, file management, and a comprehensive admin dashboard. Users interact with an AI that can create, edit, style, and iconify Mermaid diagrams through natural language, while also supporting document writing, data analysis, and multi-step planning.

### Key Features

- **AI Chat Assistant** — Natural language diagram creation/editing via OpenRouter-powered models
- **Live Mermaid Editor** — Real-time diagram rendering with pan/zoom, grid, and rough mode
- **Tool System** — 18+ AI tools (iconifier, auto-styler, web search, planner, memory, etc.)
- **File System** — Multi-file support with auto-save, versioning, and KV-backed persistence
- **Markdown Editor** — Side-by-side documentation panel
- **Audio Input** — Voice-to-text via Google Gemini 2.0 Flash Lite
- **Admin Panel** — User management, model management, drag-to-reorder, analytics
- **Credits System** — Gem-based usage tracking per model
- **Dark Mode** — Full dark/light theme with CSS custom properties

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   SvelteKit App                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Editor   │  │   Chat   │  │  Markdown Panel   │  │
│  │ (Mermaid) │  │ (AI)     │  │  (Documentation)  │  │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
│       │              │                  │             │
│  ┌────┴──────────────┴──────────────────┴──────────┐ │
│  │              Svelte Stores (State)               │ │
│  │  stateStore, fileSystemStore, kvStore, models    │ │
│  └────┬─────────────────────────────────────────────┘ │
│       │                                               │
│  ┌────┴─────────────────────────────────────────────┐ │
│  │              API Routes (/api/*)                  │ │
│  │  /chat  /kv  /admin  /auth  /audio  /upload ...  │ │
│  └────┬─────────────────────────────────────────────┘ │
└───────┼──────────────────────────────────────────────┘
        │
   ┌────┴────────────────────────┐
   │        Supabase (DB)        │
   │  users, sessions, messages  │
   │  conversations, app_settings│
   │  enabled_models, credits    │
   └────┬────────────────────────┘
        │
   ┌────┴────────────────────────┐
   │      OpenRouter (AI)        │
   │  Multi-model chat + tools   │
   └─────────────────────────────┘
```

### Data Flow

1. **User types** in chat or clicks a suggestion
2. **Client** sends message to `/api/chat` with conversation context, current diagram, and selected model
3. **Server** builds system prompt, attaches tools, streams response via OpenRouter
4. **Tool calls** are executed server-side (diagram ops, icon resolution, web search, etc.)
5. **Client** receives SSE stream, updates UI in real-time (artifacts, tool status, text)
6. **Diagram changes** are applied to the editor via `updateCodeStore`
7. **State** is persisted to KV store (Supabase `app_settings` table)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | SvelteKit (Svelte 5 with runes) |
| **Language** | TypeScript |
| **Styling** | TailwindCSS 4 + CSS custom properties |
| **UI Components** | shadcn-svelte (Button, Badge, Dialog, Popover, etc.) |
| **Icons** | Lucide Svelte + Iconify (2400+ local + 200k web) |
| **AI** | OpenRouter (multi-model), Vercel AI SDK (`@ai-sdk/openrouter`) |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Custom session-based (Supabase users table) |
| **Diagram Rendering** | Mermaid.js |
| **Audio** | Google Gemini 2.0 Flash Lite (speech-to-text) |
| **Package Manager** | pnpm |
| **Build** | Vite |

---

## Project Structure

```
src/
├── lib/
│   ├── components/ui/        # shadcn-svelte UI primitives
│   ├── features/
│   │   ├── chat/             # Chat components (Chat.simple.svelte, Response, etc.)
│   │   ├── diagram/          # Diagram rendering, pan-zoom, toolbar
│   │   ├── filesystem/       # File system store, autosave
│   │   ├── history/          # Undo/redo history
│   │   └── icons/            # Icon resolution helpers
│   ├── server/
│   │   ├── auth.ts           # Session validation, token extraction
│   │   ├── cache.ts          # In-memory cache with TTL
│   │   ├── db/
│   │   │   ├── index.ts      # getDb() singleton
│   │   │   ├── supabase-adapter.ts  # Full DatabaseAdapter implementation
│   │   │   └── types.ts      # Database type definitions
│   │   └── state-manager.ts  # Admin dashboard, settings, analytics managers
│   ├── stores/
│   │   ├── kvStore.ts        # Client-side KV store (backed by /api/kv)
│   │   ├── models.svelte.ts  # Model list store
│   │   ├── sessionFiles.svelte.ts  # Session file attachments
│   │   └── toolsStore.ts     # Tool configuration store
│   └── util/
│       ├── state.ts          # Global state stores (inputStateStore, stateStore)
│       └── diagramMapper.ts  # SVG ID to node name mapping
├── routes/
│   ├── edit/+page.svelte     # Main editor page
│   ├── admin/+page.svelte    # Admin dashboard
│   └── api/
│       ├── admin/+server.ts  # Admin API (stats, users, models, settings)
│       ├── auth/             # Login, logout, register, me endpoints
│       ├── audio/+server.ts  # Audio transcription via Gemini
│       ├── chat/+server.ts   # AI chat with tool calling
│       ├── conversations/    # Conversation CRUD
│       ├── credits/          # Credit balance & transactions
│       ├── files/            # File upload/download
│       ├── kv/+server.ts     # Key-value store API
│       ├── models/           # Public model listing
│       └── upload/           # File upload processing
├── app.css                   # Global styles, theme variables, Mermaid styles
├── app.html                  # HTML shell
└── app.d.ts                  # Type declarations
```

---

## Authentication & Users

### Flow

1. User registers/logs in via `/api/auth/login` or `/api/auth/register`
2. Server creates a session token stored in cookies
3. Each API request extracts the token via `extractToken(request)` and validates via `validateSession(token)`
4. Sessions are stored in the `sessions` table with expiry

### Roles

- **user** — Standard user, can use chat and editor
- **admin** — Access to admin panel, can manage users/models
- **superadmin** — Full access including dangerous operations

### Key Files

- `src/lib/server/auth.ts` — `extractToken()`, `validateSession()`, password hashing
- `src/routes/api/auth/` — Login, logout, register, me endpoints
- `src/lib/server/db/supabase-adapter.ts` — User CRUD, session management

---

## Database Layer

### Adapter Pattern

The app uses a `DatabaseAdapter` interface (`src/lib/server/db/types.ts`) with a Supabase implementation (`supabase-adapter.ts`). This allows swapping database backends.

### Key Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts (email, role, display_name, is_active) |
| `sessions` | Auth sessions with tokens and expiry |
| `conversations` | Chat conversations per user |
| `messages` | Individual chat messages |
| `enabled_models` | AI models available to users (with sort_order, gems_per_message) |
| `credit_balances` | User gem balances |
| `credit_transactions` | Gem transaction history |
| `app_settings` | KV store (JSONB value column, keyed by user_id + category + key) |
| `usage_stats` | Token usage tracking |
| `cache_entries` | Server-side cache |

### JSONB Envelope

The `app_settings.value` column is `JSONB NOT NULL`. Primitive values (strings, numbers, arrays) are wrapped in `{ __kv: value }` before storage and unwrapped on retrieval. This is handled transparently in `kvGet`, `kvSet`, `kvGetAll`, and `kvSetBatch`.

---

## AI Chat System

### Architecture

The chat system (`/api/chat/+server.ts`) uses:

1. **OpenRouter** via `@ai-sdk/openrouter` for multi-model support
2. **Vercel AI SDK** `streamText()` for streaming responses with tool calling
3. **Server-Sent Events (SSE)** for real-time streaming to the client
4. **In-memory stores** (`diagramStore`, `markdownStore`, `memoryStore`, `planStore`) for session state during multi-step tool calls

### Message Flow

```
Client (Chat.simple.svelte)
  → POST /api/chat { messages, model, currentDiagram, currentMarkdown, ... }
  → Server builds system prompt + tools
  → streamText() with OpenRouter model
  → SSE stream: text_delta, tool_call_start, tool_call_delta, tool_result, finish
  → Client updates messageParts[], artifactMap, reasoningMap in real-time
```

### System Prompt

The system prompt (`buildMultiStepSystemPrompt()`) defines:

- Communication rules (use emojis, be concise)
- Tool descriptions and when to use them
- Workflow for diagram edits (read → edit → validate)
- Workflow for markdown (read → write)
- Iconifier rules (NodeID = brand name, text = function)
- Subgraph patterns

---

## Tool System

The app has 18+ tools available to the AI:

### Diagram Tools
| Tool | Description |
|------|-------------|
| `diagramRead` | Read current diagram (supports line ranges) |
| `diagramWrite` | Create/replace entire diagram |
| `diagramPatch` | Replace specific line range (surgical edits) |
| `diagramDelete` | Clear diagram |
| `errorChecker` | Validate Mermaid syntax |
| `autoStyler` | Apply color palettes (vibrant, pastel, earth, ocean, sunset, monochrome) |
| `iconifier` | Attach visual icons to nodes (2400+ local + 200k Iconify web) |

### Document Tools
| Tool | Description |
|------|-------------|
| `markdownRead` | Read markdown panel content |
| `markdownWrite` | Write/append to markdown panel |

### Analysis Tools
| Tool | Description |
|------|-------------|
| `tableAnalytics` | CSV statistics, trends, chart suggestions |
| `dataAnalyzer` | Advanced data ops (frequency, groupBy, filter, topN, crossTab, correlate) |
| `actionItemExtractor` | Extract actions, risks, KPIs from text |

### Planning & Reasoning Tools
| Tool | Description |
|------|-------------|
| `planner` | Decompose complex tasks into steps |
| `planWithProgress` | Create visible plans with step-by-step progress tracking |
| `sequentialThinking` | Step-by-step reasoning visible to user |
| `selfCritique` | Evaluate and improve diagrams/documents |

### Utility Tools
| Tool | Description |
|------|-------------|
| `webSearch` | DuckDuckGo web search |
| `askQuestions` | Multi-choice questionnaire UI |
| `fileManager` | List, read, search, delete uploaded files |
| `longTermMemory` | Persistent key-value memory store |

### Client-Side Tool Rendering

Each tool has:
- **Running state** — Animated icon + status label (e.g., "Adding icons…")
- **Done state** — Static icon + completion message
- **Specific icons** — Brain (thinking), Palette (iconifier), Paintbrush (styler), Globe (search), etc.

Tool status is rendered via `ContentPart` objects with `type: 'tool-status'` in `messageParts[]`.

---

## File System & Persistence

### FileSystemStore

Located in `src/lib/features/filesystem/`, manages:

- **UserFile** objects (id, name, content, type, versions, auxiliary data)
- **Current file** tracking
- **Auto-save** via `autosaveStore` (debounced saves on content changes)
- **KV-backed persistence** (files stored in `app_settings` via `/api/kv`)

### Auto-File Creation

On page load (`edit/+page.svelte` `onMount`):
1. Attempt to load saved current file from `fileSystemStore`
2. If no file exists and `autoFileCreated` is false, create a new file named `Diagram-XXXX.mmd`
3. Set it as the current file and mark `autoFileCreated = true`

### File Operations

- **Create** — `fileSystemStore.createFile(name)`
- **Update** — `fileSystemStore.updateFile(id, content)` + `autosaveStore.markChanged()`
- **Delete** — `fileSystemStore.deleteFile(id)`
- **Load** — `fileSystemStore.loadCurrentFile()`, `fileSystemStore.loadUserFiles()`

---

## Diagram Editor

### Components

- **Mermaid Renderer** — Renders Mermaid code to SVG in real-time
- **Pan/Zoom** — `panZoomState` with mouse/touch controls
- **Toolbar** — Tools (select, hand, zoom), grid toggle, rough mode, export
- **Code Editor** — Monaco-based Mermaid code editor

### State Management

- `stateStore` — Global diagram state (`code`, `mermaid`, `updateDiagram`)
- `inputStateStore` — Editor input state
- `updateCodeStore()` — Central function to update diagram code and trigger re-render

### Keyboard Shortcuts

- `Ctrl+Z` / `Cmd+Z` — Undo
- `Ctrl+Shift+Z` / `Cmd+Shift+Z` — Redo
- `Delete` / `Backspace` — Delete selected element
- `Ctrl+E` — Export
- `Ctrl+I` — Import
- `+` / `-` — Zoom in/out
- `0` — Reset zoom

---

## Markdown Editor

The markdown panel is a side-by-side documentation editor that:

- Lives alongside the diagram editor
- Content is managed via `markdownStore` (server-side) and synced to the client
- AI can read/write via `markdownRead` and `markdownWrite` tools
- Supports streaming writes (content appears progressively)
- Rendered as a collapsible card in the chat with line count

---

## Audio Input

### Flow

1. User clicks mic button in chat toolbar
2. Browser requests microphone permission via `navigator.mediaDevices.getUserMedia`
3. `MediaRecorder` captures audio as `audio/webm`
4. On stop, audio blob is sent to `POST /api/audio` as FormData
5. Server converts to base64, sends to Google Gemini 2.0 Flash Lite API
6. Gemini transcribes audio to text
7. Transcribed text is appended to the chat input

### UI States

- **Idle** — Mic icon (muted)
- **Recording** — Red pulsing mic with red border
- **Transcribing** — Spinning indigo loader

### Configuration

- Model: `gemini-2.0-flash-lite`
- API: `https://generativelanguage.googleapis.com/v1beta/models/`
- Env var: `GEMINI_API_KEY`

---

## Admin Panel

### Access

- Navigate to `/admin`
- Login with admin credentials (role must be `admin` or `superadmin`)
- Auto-login if already authenticated with admin session

### Tabs

| Tab | Features |
|-----|----------|
| **Overview** | Stats (conversations, messages, tokens, users), recent activity |
| **Users** | Search, view details, change roles, add/set gems, activate/deactivate |
| **Conversations** | Browse all conversations, view messages |
| **Enabled Models** | View, edit, enable/disable, delete, **drag-to-reorder** |
| **OpenRouter** | Browse 200k+ models, import with custom gem cost |
| **App Data** | View all KV store entries across users |
| **Settings** | Application settings management |
| **Database** | Raw table viewer for any database table |
| **Errors** | Error log viewer |
| **Cache** | Cache info and clear operations |

### Model Reordering

Models can be reordered via:
- **Drag and drop** — Grab the grip handle and drag to new position
- **Arrow buttons** — Click up/down arrows for fine control
- Reorder is persisted via `POST /api/admin { action: 'reorderModels', updates }` which updates `sort_order` on each model

---

## Models & OpenRouter

### Model Storage

Models are stored in the `enabled_models` table with:
- `model_id` — Full model identifier (e.g., `openrouter/google/gemini-2.0-flash-001`)
- `model_name` — Display name
- `provider` — Provider name (e.g., `openrouter`)
- `category` — Free, General, Premium, Experimental
- `gems_per_message` — Cost per message
- `max_tokens` — Context window size
- `tool_support` — Whether the model supports tool calling
- `sort_order` — Display order in the model selector
- `is_enabled` — Whether visible to users
- `is_free` — Whether the model is free to use

### Client Model Selector

- Popover in chat toolbar with search
- Grouped by category
- Shows gem cost per model
- Persisted selection in KV store

---

## Credits / Gems System

### How It Works

1. Each user has a `credit_balances` record with `balance`, `lifetime_earned`, `lifetime_spent`
2. Each AI message costs gems based on the selected model's `gems_per_message`
3. Credits are deducted via `db.deductCredits()` after successful AI response
4. Admins can add/set gems via the admin panel
5. Transaction history is tracked in `credit_transactions`

### UI

- Gem count shown in the header bar
- Model selector shows gem cost per model
- Low balance warning when gems reach 0

---

## KV Store

### Architecture

```
Client (kvStore.ts)
  → fetch('/api/kv', { method, body })
  → Server (/api/kv/+server.ts)
  → DatabaseAdapter.kvGet/kvSet/kvDelete/kvGetAll/kvSetBatch
  → Supabase app_settings table (JSONB)
```

### Operations

- `kvGet(category, key)` — Get a single value
- `kvSet(category, key, value)` — Set a single value
- `kvDelete(category, key)` — Delete a value
- `kvGetAll(category?)` — Get all entries, optionally filtered by category
- `kvSetBatch(entries)` — Batch upsert

### JSONB Handling

Primitive values are wrapped in `{ __kv: value }` before storage because the `app_settings.value` column is `JSONB NOT NULL` and rejects raw primitives. Unwrapping happens transparently on read.

### Error Handling

All KV API endpoints have try-catch wrappers that return `200 OK` with error info instead of `500` errors, preventing client-side crashes.

---

## Theming & Dark Mode

### CSS Custom Properties

Defined in `src/app.css`:

- `:root` — Light theme (clean whites, balanced contrast)
- `.dark` — Dark theme (rich blacks, warm grays, indigo accent)

### Key Variables

| Variable | Light | Dark |
|----------|-------|------|
| `--background` | `#fafafa` | `#09090b` |
| `--foreground` | `#18181b` | `#f0f0f3` |
| `--card` | `#ffffff` | `#111114` |
| `--border` | `#e2e2e5` | `#27272e` |
| `--muted` | `#f0f0f2` | `#18181d` |
| `--ring` | `#18181b` | `#818cf8` |

### User Message Bubble

- Light: `bg-slate-100 text-slate-800`
- Dark: `bg-[#1e1e2a] text-[#e0e0e8]` with subtle `ring-white/[0.08]`

### Mermaid Diagram Colors

Separate CSS variables for diagram nodes, edges, and text that adapt to light/dark mode.

---

## Deployment

### Docker

```bash
docker build -t graphini .
docker run -p 3000:3000 --env-file .env graphini
```

### Netlify

Configured via `netlify.toml`. SvelteKit adapter handles SSR.

### Docker Compose

```bash
docker-compose up -d
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key for AI models |
| `GEMINI_API_KEY` | Yes | Google Gemini API key for audio transcription |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `ADMIN_EMAIL_OVERRIDES` | No | Comma-separated admin emails |
| `OPEN_ROUTER_HTTP_REFERER` | No | HTTP referer for OpenRouter |
| `OPEN_ROUTER_TITLE` | No | App title for OpenRouter |

---

*Generated documentation for Graphini — AI-Powered Mermaid Diagram Editor*
