<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Header } from '$lib/components/ui/header/index.js';
  import { HeroSection } from '$lib/components/ui/hero-section/index.js';
  import {
    ArrowRight,
    Sparkles,
    Code2,
    Paintbrush,
    Download,
    Users,
    Globe,
    Github
  } from 'lucide-svelte';

  function gotoEdit(prompt: string) {
    goto(resolve('/dashboard') + `?prompt=${encodeURIComponent(prompt)}`);
  }

  const features = [
    {
      description:
        'Describe your diagram in plain English. Graphini turns words into production-ready Mermaid code.',
      icon: Sparkles,
      title: 'AI Generation'
    },
    {
      description:
        'Full Mermaid.js support. Syntax highlighting, live preview, intelligent auto-complete.',
      icon: Code2,
      title: 'Mermaid DSL'
    },
    {
      description: 'Pan, zoom, arrange. Your workspace, your layout. No constraints.',
      icon: Paintbrush,
      title: 'Infinite Canvas'
    },
    {
      description: 'SVG, PNG, or raw Mermaid code. Embed diagrams in docs, slides, READMEs.',
      icon: Download,
      title: 'Export Anything'
    },
    {
      description: 'Save, organize, revisit. Auto-save keeps your work safe as you go.',
      icon: Users,
      title: 'Workspaces'
    },
    {
      description: 'Built in the open. Fork it, extend it, self-host it. MIT licensed.',
      icon: Globe,
      title: 'Open Source'
    }
  ];

  const prompts = [
    'microservices architecture with API gateway',
    'user authentication flow with OAuth2',
    'CI/CD pipeline for a monorepo',
    'database schema for e-commerce',
    'state machine for order processing',
    'class diagram for a chat app'
  ];

  const diagramTypes = [
    'Flowchart',
    'Sequence',
    'Class',
    'State',
    'ERD',
    'Gantt',
    'Mindmap',
    'Git Graph'
  ];

  const stack = [
    { name: 'SvelteKit', url: 'https://kit.svelte.dev' },
    { name: 'Mermaid.js', url: 'https://mermaid.js.org' },
    { name: 'TypeScript', url: 'https://typescriptlang.org' },
    { name: 'Tailwind CSS', url: 'https://tailwindcss.com' },
    { name: 'Vercel AI SDK', url: 'https://sdk.vercel.ai' },
    { name: 'Neon PostgreSQL', url: 'https://neon.tech' }
  ];
</script>

<svelte:head>
  <title>Graphini — AI-powered diagram workspace</title>
  <meta
    name="description"
    content="Turn ideas into diagrams instantly. Describe in plain English or Mermaid DSL, watch it render live. Open source, AI-powered." />
  <meta property="og:title" content="Graphini — AI-powered diagram workspace" />
  <meta
    property="og:description"
    content="Turn ideas into diagrams instantly. Describe in plain English or Mermaid DSL, watch it render live." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://graphini.magnova.ai" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="flex w-full flex-col bg-background">
  <!-- Header -->
  <Header />

  <!-- Main content -->
  <main class="grow">
    <!-- Hero Section -->
    <HeroSection />

    <!-- Example prompts -->
    <div class="mx-auto mt-16 flex max-w-3xl flex-wrap items-center justify-center gap-2 px-4">
      <span class="mr-1 text-xs font-medium text-muted-foreground">Try:</span>
      {#each prompts as prompt (prompt)}
        <button class="prompt-chip" onclick={() => gotoEdit(prompt)}>
          "{prompt}"
        </button>
      {/each}
    </div>

    <!-- Diagram types -->
    <section class="mt-16 border-y border-border py-5">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-2 px-5">
        {#each diagramTypes as type (type)}
          <button class="surface-chip" onclick={() => gotoEdit(type + ' diagram')}>
            {type}
          </button>
        {/each}
      </div>
    </section>

    <!-- Demo images -->
    <section class="mx-auto mt-20 max-w-5xl px-5 sm:px-8 md:px-10">
      <div class="mb-10 text-center">
        <h2 class="section-heading">See it in action</h2>
        <p class="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Describe your architecture in plain English, get a diagram instantly.
        </p>
      </div>
      <div class="grid gap-8">
        <div class="overflow-hidden rounded-xl border border-border">
          <img src="/demo2.png" alt="Graphini Interface" class="w-full" />
        </div>
        <div class="overflow-hidden rounded-xl border border-border">
          <img src="/demo1.png" alt="Generated Microservices Diagram" class="w-full" />
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="mx-auto max-w-6xl px-5 py-24 sm:px-8 md:px-10">
      <div class="mb-16 text-center">
        <h2 class="section-heading">Everything you need to diagram</h2>
        <p class="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
          From quick sketches to production architecture docs.
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each features as feature (feature.title)}
          {@const Icon = feature.icon}
          <div class="feature-card">
            <div class="mb-5 flex size-10 items-center justify-center rounded-lg bg-muted">
              <Icon class="size-[18px] text-muted-foreground" />
            </div>
            <h3 class="mb-2 text-[15px] font-semibold text-foreground">{feature.title}</h3>
            <p class="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
          </div>
        {/each}
      </div>
    </section>

    <!-- Built with -->
    <section
      class="mx-auto max-w-5xl border-t border-border px-5 py-20 text-center sm:px-8 md:px-10">
      <h2 class="mb-3 text-lg font-bold tracking-tight text-foreground">Built with</h2>
      <p class="mb-8 text-sm text-muted-foreground">Modern stack, open source all the way down.</p>
      <div class="flex flex-wrap items-center justify-center gap-2.5">
        {#each stack as tech (tech.name)}
          <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
          <a href={tech.url} target="_blank" rel="noopener noreferrer" class="tech-chip"
            >{tech.name}</a>
        {/each}
      </div>
    </section>

    <!-- CTA -->
    <section
      class="mx-auto max-w-4xl border-t border-border px-5 py-24 text-center sm:px-8 md:px-10">
      <h2 class="text-[clamp(1.5rem,5vw,2.25rem)] font-bold tracking-tight text-foreground">
        Ready to diagram?
      </h2>
      <p class="mt-4 text-base text-muted-foreground">
        Sign in, create a workspace, and start building.
      </p>
      <div class="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
        <a
          href={resolve('/dashboard')}
          class="btn-primary min-w-[200px] justify-center py-3 text-sm">
          Go to Dashboard
          <ArrowRight class="size-4" />
        </a>
        <a
          href="https://github.com/omkarbhad/graphini"
          target="_blank"
          rel="noopener"
          class="btn-secondary min-w-[200px] justify-center">
          <Github class="size-4" />
          View Source
        </a>
      </div>
    </section>
  </main>

  <!-- Footer -->
  <footer class="border-t border-border px-5 py-6 sm:px-8 md:px-10">
    <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
      <div class="flex items-center gap-3">
        <img src="/brand/logo.png" alt="Graphini" class="size-5 rounded-md" />
        <span class="text-sm font-semibold text-foreground">Graphini</span>
        <span class="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Magnova
        </span>
      </div>
      <nav class="flex items-center gap-5">
        <a
          href={resolve('/dashboard')}
          class="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >Dashboard</a>
        <a
          href="https://github.com/omkarbhad/graphini"
          target="_blank"
          rel="noopener"
          class="text-sm text-muted-foreground transition-colors hover:text-foreground">GitHub</a>
        <a
          href="https://github.com/omkarbhad/graphini/blob/main/CONTRIBUTING.md"
          target="_blank"
          rel="noopener"
          class="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >Contributing</a>
        <a
          href="https://github.com/omkarbhad/graphini/blob/main/LICENSE"
          target="_blank"
          rel="noopener"
          class="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >MIT License</a>
      </nav>
    </div>
  </footer>
</div>

<style>
  @reference "../app.css";

  /* ── Buttons ── */
  .btn-primary {
    @apply inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-150;
    @apply focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none;
    background: var(--color-primary);
  }
  .btn-primary:hover {
    opacity: 0.9;
  }

  .btn-secondary {
    @apply inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-150;
    @apply focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none;
    background: var(--color-card);
    border: 1px solid var(--color-border);
  }
  .btn-secondary:hover {
    background: var(--color-accent);
    color: var(--color-foreground);
  }

  .prompt-chip {
    @apply cursor-pointer rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors duration-150;
    @apply focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none;
    border: 1px solid var(--color-border);
    background: var(--color-card);
    color: var(--color-muted-foreground);
  }
  .prompt-chip:hover {
    border-color: var(--color-primary);
    background: var(--color-accent);
    color: var(--color-foreground);
  }

  .surface-chip {
    @apply cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150;
    background: var(--color-card);
    border: 1px solid var(--color-border);
  }
  .surface-chip:hover {
    border-color: var(--color-primary);
    background: var(--color-accent);
    color: var(--color-foreground);
  }

  /* ── Section headings ── */
  .section-heading {
    @apply text-[clamp(1.5rem,4vw,2.5rem)] font-bold tracking-tight text-foreground;
  }

  /* ── Feature Cards ── */
  .feature-card {
    @apply relative rounded-xl p-6 transition-colors duration-150;
    background: var(--color-card);
    border: 1px solid var(--color-border);
  }
  .feature-card:hover {
    border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border));
  }

  /* ── Tech chips ── */
  .tech-chip {
    @apply rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-150;
    @apply focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none;
    background: var(--color-card);
    border: 1px solid var(--color-border);
    color: var(--color-muted-foreground);
  }
  .tech-chip:hover {
    border-color: var(--color-primary);
    background: var(--color-accent);
    color: var(--color-foreground);
  }
</style>
