<p align="center">
  <img src="static/favicon.svg" width="96" height="96" alt="Graphini" />
</p>

<h1 align="center">Graphini</h1>

<p align="center">
  <b>AI-powered diagram editor where every diagram is code — describe it, render it, version it, self-host it.</b>
</p>

<p align="center">
  <a href="#-why-graphini">Why</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-quick-start">Quick Start</a> ·
  <a href="#-architecture">Architecture</a> ·
  <a href="#-api-reference">API</a> ·
  <a href="#-roadmap">Roadmap</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/SvelteKit-2-ff3e00?logo=svelte&logoColor=white" alt="SvelteKit" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Mermaid.js-diagrams--as--code-ff3670?logo=mermaid&logoColor=white" alt="Mermaid" />
  <img src="https://img.shields.io/badge/Vercel_AI_SDK-v6-000?logo=vercel&logoColor=white" alt="Vercel AI SDK" />
  <img src="https://img.shields.io/badge/Supabase-auth-3ecf8e?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Drizzle-ORM-c5f74f" alt="Drizzle" />
  <img src="https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white" alt="Tailwind v4" />
  <img src="https://img.shields.io/badge/Docker-self--host-2496ed?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
</p>

<p align="center">
  <img src="static/demo2.png" alt="Graphini interface" width="820" />
</p>

<p align="center">
  <img src="static/demo1.png" alt="Generated microservices architecture" width="820" />
</p>

---

## ✨ Why Graphini?

Every AI diagramming tool hits the same wall: the output is a *picture*. You can't diff it, you can't version it, you can't regenerate it from the source of truth. Graphini is different because **every diagram is a Mermaid / Structurizr text artifact** — so it lives in git, diffs in PRs, and renders deterministically every time.

- **Diagrams-as-code, not canvas blobs.** Output is Mermaid (flowchart, sequence, ER, state, class, gitgraph…) or Structurizr DSL — plain text you can check in.
- **Real multi-provider AI.** Built on the Vercel AI SDK with OpenAI, Anthropic, OpenRouter, and Gemini. Swap providers without code changes.
- **Cloud architecture, done right.** AWS icon pack is built into the bundle via a pre-build script, so your architecture diagrams use real service icons — not generic boxes.
- **Memory that sticks.** User memories let Graphini learn your naming conventions, preferred diagram style, and domain vocabulary across sessions.
- **Self-hostable.** Docker, Node adapter, static adapter, or Vercel — pick your deployment. No lock-in.

> Unlike canvas-based AI tools like Excalidraw-plus-plugins or closed-format drag-drop editors, **Graphini produces text-first diagrams you own, version, and re-render forever** — with a workspace, file persistence, and a proper API on top.

---

## 📑 Table of Contents

<details>
<summary>Click to expand</summary>

- [✨ Why Graphini?](#-why-graphini)
- [📐 Purpose-Built for Diagrams-as-Code (vs Alternatives)](#-purpose-built-for-diagrams-as-code-vs-alternatives)
- [🔭 Features](#-features)
- [🧰 Tech Stack](#-tech-stack)
- [🏗 Architecture](#-architecture)
- [🚀 Quick Start](#-quick-start)
- [🐳 Docker](#-docker)
- [🔑 Configuration](#-configuration)
- [🌐 API Reference](#-api-reference)
- [📁 Project Structure](#-project-structure)
- [🧪 Testing](#-testing)
- [🗺 Roadmap](#-roadmap)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)

</details>

---

## 📐 Purpose-Built for Diagrams-as-Code (vs Alternatives)

There are plenty of ways to make a diagram with AI. None of them do the job Graphini does, because each was built for a different workflow:

| Tool | What it answers | Where Graphini differs |
|---|---|---|
| **Mermaid Live Editor** | "I already wrote Mermaid, render it" | No AI — you write the DSL by hand. Graphini generates and iterates it for you. |
| **ChatGPT / Claude "make me a diagram"** | "One-shot, throwaway diagram" | No persistence, no memories, no workspace, no files, no Structurizr, no AWS icons, no API. |
| **Excalidraw + AI plugins** | "Sketch it out visually" | Canvas-blob output — not text, not versionable, not regeneratable from source. |
| **draw.io / Lucidchart** | "Drag-and-drop corporate diagrams" | Manual, closed-format, no AI-native editing loop. |
| **Eraser.io** | "Paid hosted AI diagrams" | Closed-source, closed-format, single-provider. Graphini is **open-source, self-hostable, multi-provider**. |
| **Structurizr Lite** | "C4 architecture diagrams from DSL" | No AI authoring, no chat loop. Graphini **speaks Structurizr *and* Mermaid** in the same workspace. |
| **Graphini** (this project) | *"Describe what I want → get versionable diagram code → iterate it with AI → ship it in git."* | Diagrams-as-code · multi-provider AI · memories · workspace · files · AWS icons · Structurizr · self-host |

### Why a generic "AI + Mermaid" wrapper would miss the point

You could glue GPT to Mermaid Live Editor in an afternoon. Graphini does seven things on top that a wrapper does not:

1. **Multi-DSL, not just Mermaid.** The [`structurizr`](src/lib/features/structurizr) feature adds full C4 model support — so architects get real C1/C2/C3 diagrams, not just flowcharts with rounded corners.
2. **AWS icon pack baked into the build.** [`scripts/build-aws-icon-pack.mjs`](scripts/build-aws-icon-pack.mjs) runs on `predev` / `prebuild` and ships real AWS service icons into the bundle. Your "architecture" diagrams look like architecture.
3. **Persistent files, not ephemeral chats.** Projects have real files (see `add-files-persistence.sql`), so a single diagram can grow across sessions instead of getting lost when a chat resets.
4. **User memories.** The `user_memories` table lets the AI remember your naming conventions, preferred layout direction, and domain vocabulary — so you don't re-explain "we always use `svc_*` for services" every session.
5. **Workspace + admin panel.** Multi-user workspace, admin settings, app settings — it's a product, not a demo. See [`src/routes/workspace`](src/routes/workspace) and [`src/routes/admin`](src/routes/admin).
6. **A real, documented API.** [`api/openapi.yaml`](api/openapi.yaml) spec. Build your own integrations or drive Graphini from CI.
7. **Provider-agnostic via Vercel AI SDK.** Swap OpenAI → Anthropic → OpenRouter → Gemini in settings. No hard-coded provider, no vendor lock-in.

### Honest trade-offs

**Graphini is not a free-form whiteboard.** If you want pixel-perfect hand-drawn canvases with stickies and arrows-that-bend-where-you-want, use **Excalidraw**. If you want a corporate visio-style drag-drop environment with a thousand stencils, use **Lucidchart** or **draw.io**. If you just need to render Mermaid you already wrote, use **Mermaid Live Editor**.

Use **Graphini** when you want your diagrams to live in **git** — versionable, diffable, AI-editable, and rebuildable — with real cloud icons, real C4 support, and a real API around them.

---

## 🔭 Features

### 🗣 Natural Language → Diagrams
- **Plain-English prompts** turn into Mermaid or Structurizr DSL
- **AI-powered editing** — modify, expand, restyle, or refactor with chat commands
- **Real-time preview** — diagram updates as the code streams

### 📝 Diagrams as Code
- **Mermaid** — flowcharts, sequence, class, state, ER, gitgraph, C4, mindmap, timeline, and more
- **Structurizr DSL** — full C4 model support for software architecture
- **Text-first output** — every diagram is a plain-text artifact you can version-control

### ☁️ Cloud Architecture
- **AWS icon pack** built into the bundle via [`scripts/build-aws-icon-pack.mjs`](scripts/build-aws-icon-pack.mjs)
- Real AWS service icons in generated diagrams — not placeholder boxes

### 🧠 User Memories
- **Per-user memory** table so the AI remembers your conventions across sessions
- Naming patterns, preferred direction, domain vocabulary — learned once, reused forever

### 📁 Files & Workspaces
- **Persistent files** — multi-file projects, not single-diagram toys
- **Workspace** with dashboard, edit, and view modes
- **Admin panel** — user management, app settings, provider config

### 🔌 Multi-Provider AI
- Built on the **Vercel AI SDK** (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`)
- Supports **OpenAI · Anthropic · OpenRouter · Gemini**
- Swap providers in settings — no code change, no redeploy

### 🔐 Auth & Storage
- **Supabase Authentication**
- **Drizzle ORM** with PostgreSQL — typed migrations, checked-in schemas
- **Performance indexes** SQL shipped in [`database/`](database/)

### 🌐 API & Self-Hosting
- **Documented API** via [`api/openapi.yaml`](api/openapi.yaml)
- **Docker + docker-compose** self-hosting
- **Node adapter**, **static adapter**, or **Vercel adapter** — pick your deployment
- **Nginx** reverse-proxy config included

### 🧪 Testing
- **Vitest** for unit tests
- **Playwright** for E2E
- Coverage via `@vitest/coverage-v8`

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | SvelteKit 2 · Vite · TypeScript 5 |
| **Styling** | Tailwind CSS v4 · `bits-ui` · `@tailwindcss/typography` |
| **Icons** | Lucide · Iconify · Material Symbols · MDI · AWS icon pack |
| **Diagram Engines** | Mermaid.js · Structurizr DSL |
| **AI Gateway** | Vercel AI SDK — OpenAI · Anthropic · OpenRouter · Gemini |
| **Auth** | Supabase Authentication |
| **Database** | PostgreSQL via Drizzle ORM |
| **Testing** | Vitest · Playwright |
| **Linting** | ESLint 9 · Prettier · `eslint-plugin-svelte` · `eslint-plugin-tailwindcss` |
| **Deployment** | Vercel · Node adapter · Static adapter · Docker · Netlify · Nginx |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  SvelteKit (Vite + TS + Tailwind v4)                        │
│                                                              │
│   Routes:  dashboard · workspace · edit · view · canvas     │
│            admin · api                                       │
│                                                              │
│   Features:                                                  │
│     ┌────────┐ ┌────────┐ ┌─────────────┐ ┌─────────┐       │
│     │  chat  │ │diagram │ │ structurizr │ │ editor  │       │
│     └────────┘ └────────┘ └─────────────┘ └─────────┘       │
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  SvelteKit API routes  (server hooks, OpenAPI spec)         │
│                                                              │
│   ├── Vercel AI SDK  ──▶  OpenAI · Anthropic · OR · Gemini  │
│   ├── Drizzle ORM    ──▶  PostgreSQL                        │
│   │                          • users · files · memories     │
│   │                          • app_settings · admin_settings│
│   └── Supabase Auth  ◀──  session + RLS                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key design decisions**

- 📝 **Text artifacts, not canvas blobs.** Diagrams are Mermaid/Structurizr strings end-to-end — they round-trip through git cleanly.
- 🧱 **Feature-scoped modules.** `src/lib/features/{chat,diagram,editor,structurizr,history,icons}` — each feature owns its stores, components, and types.
- 🎨 **Design tokens in code.** `src/lib/design-tokens.ts` and `src/lib/themes/` — swappable at runtime.
- 🔌 **Vercel AI SDK as the single LLM surface.** Provider swap = settings change, not refactor.
- 🧪 **Serious test posture.** Vitest for units, Playwright for E2E, coverage gates in CI.
- 🐳 **Multi-adapter deployment.** Node for self-hosters, static for CDN, Vercel for zero-config, Docker for everything else.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+
- **pnpm** 9+
- **PostgreSQL** database (local or hosted)
- *(optional)* **Supabase** project for auth

### Install

```bash
git clone https://github.com/omkarbhad/graphini.git
cd graphini
pnpm install
```

### Run

```bash
pnpm dev            # Vite dev server
pnpm dev:node       # With Node adapter (self-host preview)
pnpm build          # Production build
pnpm preview        # Preview production build
```

Open [http://localhost:3000](http://localhost:3000).

### Database

Apply schema and migrations from [`database/`](database/):

```bash
psql "$DATABASE_URL" -f database/schema.sql
psql "$DATABASE_URL" -f database/v2-schema.sql
psql "$DATABASE_URL" -f database/add-app-settings.sql
psql "$DATABASE_URL" -f database/add-admin-settings.sql
psql "$DATABASE_URL" -f database/add-files-persistence.sql
psql "$DATABASE_URL" -f database/add-files-support.sql
psql "$DATABASE_URL" -f database/add-user-memories.sql
psql "$DATABASE_URL" -f database/add-gemini-provider.sql
psql "$DATABASE_URL" -f database/performance-indexes.sql
```

---

## 🐳 Docker

```bash
docker-compose up --build
```

A `Dockerfile`, `docker-compose.yml`, and `nginx.conf` are shipped in the repo — self-host on any VPS in under five minutes.

---

## 🔑 Configuration

LLM providers and database credentials can be configured via the in-app Settings panel *or* environment variables. Typical `.env`:

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/graphini

# Supabase (auth)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI providers — set whichever you use
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=sk-or-...
GEMINI_API_KEY=...
```

---

## 🌐 API Reference

Graphini ships an OpenAPI 3 spec at [`api/openapi.yaml`](api/openapi.yaml). Import it into Postman, Insomnia, or any OpenAPI client to drive Graphini from your own tools or CI.

---

## 📁 Project Structure

```
graphini/
├── api/
│   └── openapi.yaml                # Public OpenAPI spec
├── database/                       # SQL schema + migrations
│   ├── schema.sql
│   ├── v2-schema.sql
│   ├── add-files-persistence.sql
│   ├── add-user-memories.sql
│   ├── add-gemini-provider.sql
│   ├── add-admin-settings.sql
│   ├── add-app-settings.sql
│   └── performance-indexes.sql
├── docs/                           # Additional docs
├── scripts/
│   └── build-aws-icon-pack.mjs     # Pre-build AWS icon bundling
├── src/
│   ├── app.css · app.html · hooks.server.ts
│   ├── lib/
│   │   ├── components/             # UI components
│   │   ├── features/
│   │   │   ├── chat/               # AI chat loop
│   │   │   ├── diagram/             # Mermaid rendering + store
│   │   │   ├── editor/              # Code editor surface
│   │   │   ├── structurizr/         # C4 model / Structurizr DSL
│   │   │   ├── history/             # Per-file history
│   │   │   └── icons/               # Icon pack loaders
│   │   ├── server/                  # Server-only utilities
│   │   ├── stores/                  # Svelte stores
│   │   ├── themes/                  # Theming
│   │   ├── design-tokens.ts
│   │   ├── constants.ts
│   │   └── util/
│   ├── routes/
│   │   ├── dashboard/
│   │   ├── workspace/
│   │   ├── edit/
│   │   ├── view/
│   │   ├── canvas/
│   │   ├── admin/
│   │   └── api/                     # SvelteKit API endpoints
│   └── types/
├── static/                          # Logo, demo images, favicons, brand, AWS icons
├── tests/                           # E2E test suites
├── Dockerfile
├── docker-compose.yml
├── netlify.toml
├── nginx.conf
├── svelte.config.js
├── vite.config.js
├── drizzle.config.ts
├── playwright.config.ts
└── tailwind.config.js
```

---

## 🧪 Testing

```bash
pnpm test              # Unit + E2E
pnpm test:unit         # Vitest
pnpm test:unit:ui      # Vitest UI
pnpm test:unit:coverage
pnpm test:e2e          # Playwright
pnpm test:e2e:ui       # Playwright UI
pnpm test:e2e:debug    # Playwright debug
```

---

## 🗺 Roadmap

- [x] Mermaid diagram generation from natural language
- [x] Structurizr DSL / C4 model support
- [x] AWS icon pack
- [x] Multi-provider AI (OpenAI · Anthropic · OpenRouter · Gemini)
- [x] User memories across sessions
- [x] File persistence + workspace
- [x] Admin panel
- [x] Public OpenAPI spec
- [x] Docker self-host
- [ ] Realtime multi-user collaboration on a single diagram
- [ ] Azure + GCP icon packs
- [ ] Export to PNG / SVG / PDF with one click
- [ ] VS Code extension
- [ ] Diagram diffing in PRs (GitHub App)
- [ ] Template gallery (system design, onboarding, infra, CI/CD)

Got an idea? [Open an issue](https://github.com/omkarbhad/graphini/issues) or start a discussion.

---

## 🤝 Contributing

Contributions are what make open source amazing. **Any contribution you make is greatly appreciated.**

1. Fork the project
2. Create your feature branch — `git checkout -b feature/amazing-feature`
3. Commit your changes — `git commit -m 'Add amazing feature'`
4. Push to the branch — `git push origin feature/amazing-feature`
5. Open a Pull Request

👉 New here? Look for [`good first issue`](https://github.com/omkarbhad/graphini/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) labels.

---

## 📜 License

[MIT](LICENSE) © [Omkar Bhad](https://github.com/omkarbhad)

---

## 🙏 Acknowledgments

- [**Mermaid.js**](https://mermaid.js.org) — the text-first diagramming engine that makes this possible
- [**Structurizr**](https://structurizr.com) — for the C4 model and DSL
- [**SvelteKit**](https://kit.svelte.dev) — the framework
- [**Vercel AI SDK**](https://sdk.vercel.ai) — unified LLM gateway
- [**Supabase**](https://supabase.com) — auth
- [**Drizzle ORM**](https://orm.drizzle.team) — typed SQL
- [**AWS Architecture Icons**](https://aws.amazon.com/architecture/icons/) — cloud diagram fidelity

---

<p align="center">
  Built with ❤️ for anyone who believes diagrams belong in git.
</p>
