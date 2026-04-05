# Skills & Technical Stack

## Frontend

- **SvelteKit 5** — Reactive UI framework with runes (`$state`, `$derived`, `$effect`)
- **TypeScript** — Full type safety across client and server
- **TailwindCSS** — Utility-first styling with dark/light theme support
- **shadcn/ui (svelte)** — Accessible component primitives
- **Monaco Editor** — Code editing (mermaid syntax + markdown)
- **Mermaid.js** — Diagram rendering with ELK/Dagre layouts
- **lucide-svelte** — Icon library
- **Pan/Zoom** — Canvas interaction with SVG manipulation

## Backend

- **SvelteKit API Routes** — RESTful endpoints (`/api/auth`, `/api/chat`, `/api/credits`, `/api/kv`, etc.)
- **Supabase (PostgreSQL)** — Database with switchable adapter pattern
- **scrypt** — Password hashing (built-in Node.js crypto)
- **Session-based Auth** — HttpOnly cookies, 7-day expiry
- **Server-Sent Events** — Streaming AI responses
- **KV Store** — Supabase-backed key-value store with in-memory cache + localStorage fallback

## AI / LLM Integration

- **OpenRouter API** — Multi-model support (GPT-4, Claude, Gemini, etc.)
- **Multi-step Tool Calling** — Up to 5 sequential tool steps per request
- **Streaming** — Real-time token-by-token response rendering via SSE
- **Credits System** — Per-request billing with model-specific gem pricing
- **Prompt Enhancer** — Dedicated fast model (configurable via admin) for improving user prompts

## AI Tools (all available to the model)

- **diagramRead** — Read current diagram content (supports line ranges)
- **diagramWrite** — Replace entire diagram with new Mermaid content
- **diagramPatch** — Surgically replace specific line ranges in the diagram
- **diagramDelete** — Clear the entire diagram
- **iconifier** — Attach/remove visual icons to diagram nodes via Iconify API (90% confidence threshold)
- **autoStyler** — Auto-style all nodes/subgraphs with harmonious color palettes (vibrant, pastel, earth, ocean, sunset, monochrome)
- **errorChecker** — Validate Mermaid syntax with regex + client-side mermaid.parse()
- **webSearch** — Search the web for documentation, patterns, and current information
- **askQuestions** — Present multiple-choice questionnaires to clarify ambiguous requests
- **markdownRead** — Read content from the document editor panel
- **markdownWrite** — Write/append documentation to the document editor panel
- **planner** — Decompose complex tasks into step-by-step plans
- **planWithProgress** — Create visible checklists with real-time progress tracking
- **actionItemExtractor** — Extract tasks, risks, KPIs, entities from documents
- **tableAnalytics** — Analyze CSV/tabular data with statistics, trends, chart suggestions
- **dataAnalyzer** — Computational analysis on uploaded CSV/Excel files (frequency, top-N, filter, correlate, pivot, custom)
- **selfCritique** — Evaluate and improve diagrams/documents for quality and completeness
- **fileManager** — Manage uploaded files (list, read, search, delete, summary)
- **longTermMemory** — Persist user preferences and context across sessions
- **sequentialThinking** — Step-by-step visible reasoning for complex problems

## Architecture Patterns

- **Database Adapter Pattern** — Swap DB implementations (Supabase, raw PG, Prisma)
- **Two-Layer Cache** — L1 in-memory LRU + L2 DB-backed persistent cache
- **Dynamic Panel System** — Drag-and-drop reorderable, resizable panels
- **Per-file State** — Markdown, diagram code, and auxiliary data per file
- **Server-synced Preferences** — User settings persisted to server with localStorage fallback
- **Auth Caching** — localStorage-cached auth state for instant UI hydration on refresh
- **Data-first Loading** — Loading gate prevents empty state flash; restores session before rendering

## DevOps

- **Docker** — Containerized deployment
- **Netlify** — Static/SSR deployment
- **GitHub Actions** — CI/CD with CodeQL analysis
- **Playwright** — E2E testing
- **ESLint + Prettier** — Code quality

## Key Features

- Real-time collaborative diagram editing
- AI-powered diagram generation and modification with 20+ tools
- Iconifier tool with 90% confidence matching via Iconify API
- Element toolbar with shape/color/font/arrow editing
- Markdown document panel with live preview
- File system with folders, drag-and-drop, search
- Keyboard shortcuts for all major actions
- Theme-aware SVG icon rendering (dark/light mode)
- Credit-based usage with gem purchase system
- Workspace collaboration with role management
- Conversation history with persistence across refresh
- Admin panel with settings, user management, cache, error logs, and usage tracking
