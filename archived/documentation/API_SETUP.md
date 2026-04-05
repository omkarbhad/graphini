# AI Chat API Setup

This project includes an AI chat API endpoint at `/api/chat` that requires server-side runtime support.

## Configuration

The project supports two build modes:

### 1. Static Mode (Default)

- Uses `@sveltejs/adapter-static`
- Generates static HTML/CSS/JS files
- **Does NOT support the `/api/chat` endpoint**
- Use for static deployments (Netlify, GitHub Pages, etc.)

### 2. Node Mode (For AI Chat Features)

- Uses `@sveltejs/adapter-node`
- Supports server-side API routes
- **Required for the AI chat functionality**
- Use for server deployments (Node.js, Docker, etc.)

## Running in Node Mode

To enable the AI chat API, use the node-specific commands:

```bash
# Development with server support
pnpm dev:node

# Build with server support
pnpm build:node
```

## Environment Variables

Copy `.env.example` to `.env` and configure your AI provider:

### Option A: OpenRouter (Recommended)

```env
OPEN_ROUTER_KEY=your_key_here
OPEN_ROUTER_MODEL=openai/gpt-4o
```

### Option B: OpenAI Direct

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o
```

## Deployment

### Static Deployment (No AI Chat)

```bash
pnpm build
# Deploy the `docs` folder
```

### Node.js Deployment (With AI Chat)

```bash
pnpm build:node
# Deploy the `build` folder with Node.js runtime
```

## Technical Details

The adapter selection is controlled by the `USE_NODE_ADAPTER` environment variable in `svelte.config.js`. When set to `'true'`, it uses the node adapter; otherwise, it defaults to the static adapter.
