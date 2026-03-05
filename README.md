# Graphini

**Turn ideas into diagrams, instantly.**

Graphini is an AI-powered diagram workspace. Describe your system in plain English, paste Mermaid syntax, or use the chat sidebar — and watch your diagram render live on an infinite canvas.

→ **Live:** [graphini.magnova.ai](https://graphini.magnova.ai)

---

## Features

- **AI Chat** — Describe diagrams in natural language. The AI generates and places them on canvas automatically.
- **Mermaid DSL** — Full support for flowcharts, sequence diagrams, class diagrams, mind maps, and more.
- **Infinite Canvas** — Smooth pan, zoom, and multi-select built on Plait/Drawnix.
- **Export** — PNG, SVG, JSON — your diagrams, your formats.
- **Fast Models** — Powered by OpenRouter with streaming support (DeepSeek R1, Qwen3, GLM-4.5 Air).

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router) |
| Canvas | Plait / Drawnix |
| Diagrams | Mermaid.js |
| AI | OpenRouter (streaming) |
| Styling | Tailwind CSS + shadcn/ui |
| Fonts | Geist |

---

## Getting Started

```bash
# 1. Clone
git clone https://github.com/omkarbhad/graphini.git
cd graphini

# 2. Install
npm install

# 3. Configure
cp .env.example .env.local
# Add your OPENROUTER_API_KEY

# 4. Run
npm run dev
# Open http://localhost:3000
```

### Environment Variables

```env
# Required — get a key at openrouter.ai/keys
OPENROUTER_API_KEY=sk-or-...

# Optional
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Project Structure

```
graphini/
├── app/
│   ├── page.tsx          # Homepage (marketing)
│   ├── editor/           # Canvas editor
│   ├── dashboard/        # User dashboard (diagrams)
│   └── api/chat/         # AI streaming endpoint
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── ai-elements/      # Chat UI components
│   └── chatbox.tsx       # Chat sidebar
├── packages/
│   └── drawnix/          # Canvas engine (Plait-based)
└── lib/
    ├── utils.ts
    └── performance.ts
```

---

## Roadmap

- [x] AI chat → canvas generation
- [x] Mermaid DSL support
- [x] Streaming responses
- [x] Homepage + dashboard
- [ ] Firebase Auth (Google sign-in)
- [ ] Neon DB (save/load diagrams)
- [ ] Shareable diagram links
- [ ] Collaborative editing (real-time)

---

## Contributing

PRs welcome. Open an issue first for significant changes.

```bash
# Dev
npm run dev

# Lint
npm run lint

# Build (check for TS errors)
npm run build
```

### Ways to contribute

- 🐛 [Report a bug](https://github.com/omkarbhad/graphini/issues/new?labels=bug)
- 💡 [Request a feature](https://github.com/omkarbhad/graphini/issues/new?labels=enhancement)
- 🔧 Submit a PR — see open issues for ideas
- ⭐ Star the repo to help it grow

---

## Contributors

Thanks to everyone who's helped build Graphini.

<!-- ALL-CONTRIBUTORS-LIST:START -->
<table>
  <tr>
    <td align="center">
      <a href="https://github.com/omkarbhad">
        <img src="https://github.com/omkarbhad.png" width="64" style="border-radius:50%" /><br />
        <sub><b>Omkar Bhad</b></sub>
      </a><br />
      <sub>Creator · Core</sub>
    </td>
  </tr>
</table>
<!-- ALL-CONTRIBUTORS-LIST:END -->

> Want to show up here? Open a PR or contribute an issue fix. We use [all-contributors](https://allcontributors.org/) — code isn't the only way to contribute.

---

## Sponsors

Graphini is free and open source. If it saves you time, consider sponsoring development.

**Current sponsors:** _none yet — be the first!_

<a href="https://github.com/sponsors/omkarbhad">
  <img src="https://img.shields.io/badge/Sponsor-❤️-ea4aaa?style=flat-square&logo=github" alt="Sponsor on GitHub" />
</a>

### Built with support from

| | |
|---|---|
| [Magnova.ai](https://magnova.ai) | AI product studio — builds and ships open-source AI tools |
| [OpenRouter](https://openrouter.ai) | Multi-model AI gateway powering the chat |
| [Plait](https://github.com/plait-board/plait) | Open-source whiteboard engine |
| [Neon](https://neon.tech) | Serverless Postgres _(coming soon)_ |

---

## License

MIT © [Magnova.ai](https://magnova.ai)
