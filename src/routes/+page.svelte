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
    Github,
    Heart
  } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  let mounted = $state(false);
  onMount(() => {
    mounted = true;
  });

  function gotoEdit(prompt: string) {
    goto(resolve('/dashboard') + `?prompt=${encodeURIComponent(prompt)}`);
  }

  const features = [
    {
      color: 'from-blue-600 to-blue-400',
      description:
        'Describe your diagram in plain English. Graphini turns words into production-ready Mermaid code.',
      glow: 'rgba(37, 99, 235, 0.15)',
      icon: Sparkles,
      title: 'AI Generation'
    },
    {
      color: 'from-cyan-500 to-blue-500',
      description:
        'Full Mermaid.js support. Syntax highlighting, live preview, intelligent auto-complete.',
      glow: 'rgba(6, 182, 212, 0.15)',
      icon: Code2,
      title: 'Mermaid DSL'
    },
    {
      color: 'from-indigo-500 to-blue-500',
      description: 'Pan, zoom, arrange. Your workspace, your layout. No constraints.',
      glow: 'rgba(99, 102, 241, 0.15)',
      icon: Paintbrush,
      title: 'Infinite Canvas'
    },
    {
      color: 'from-amber-500 to-orange-500',
      description: 'SVG, PNG, or raw Mermaid code. Embed diagrams in docs, slides, READMEs.',
      glow: 'rgba(245, 158, 11, 0.15)',
      icon: Download,
      title: 'Export Anything'
    },
    {
      color: 'from-emerald-500 to-teal-500',
      description: 'Save, organize, revisit. Auto-save keeps your work safe as you go.',
      glow: 'rgba(16, 185, 129, 0.15)',
      icon: Users,
      title: 'Workspaces'
    },
    {
      color: 'from-rose-500 to-pink-500',
      description: 'Built in the open. Fork it, extend it, self-host it. MIT licensed.',
      glow: 'rgba(244, 63, 94, 0.15)',
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
    'Pie',
    'Git Graph',
    'Mindmap',
    'Timeline',
    'Quadrant',
    'Sankey',
    'XY Chart'
  ];

  const stack = [
    { name: 'SvelteKit', url: 'https://kit.svelte.dev' },
    { name: 'Mermaid.js', url: 'https://mermaid.js.org' },
    { name: 'TypeScript', url: 'https://typescriptlang.org' },
    { name: 'Tailwind CSS', url: 'https://tailwindcss.com' },
    { name: 'Vercel AI SDK', url: 'https://sdk.vercel.ai' },
    { name: 'Neon PostgreSQL', url: 'https://neon.tech' }
  ];

  const steps = [
    {
      step: '01',
      title: 'Describe or write',
      desc: 'Type a prompt like "user login flow" or write Mermaid DSL directly in the editor.'
    },
    {
      step: '02',
      title: 'Watch it render',
      desc: 'Graphini generates and renders your diagram in real-time. Edit, tweak, iterate.'
    },
    {
      step: '03',
      title: 'Export & share',
      desc: 'Download as SVG/PNG, copy the code, or save to your workspace for later.'
    }
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
    {#if mounted}
      <div
        class="mx-auto mt-16 flex max-w-3xl flex-wrap items-center justify-center gap-2 px-4"
        in:fade={{ duration: 500, delay: 500 }}>
        <span class="mr-1 text-xs font-medium text-muted-foreground">Try:</span>
        {#each prompts as prompt (prompt)}
          <button class="prompt-chip" onclick={() => gotoEdit(prompt)}>
            "{prompt}"
          </button>
        {/each}
      </div>
    {/if}

    <!-- Diagram types marquee -->
    <section class="mt-16 overflow-hidden border-y border-border py-5">
      <div class="marquee-track flex gap-6">
        {#each [...diagramTypes, ...diagramTypes, ...diagramTypes] as type, i (i)}
          <span class="surface-chip shrink-0">{type}</span>
        {/each}
      </div>
    </section>

    <!-- Features -->
    <section class="mx-auto max-w-6xl px-5 py-28 sm:px-8 md:px-10">
      <div class="mb-20 text-center">
        <h2 class="section-heading">Everything you need to diagram</h2>
        <div
          class="mx-auto mt-5 h-px w-16 bg-gradient-to-r from-transparent via-primary to-transparent">
        </div>
        <p class="mx-auto mt-5 max-w-lg text-sm text-muted-foreground">
          From quick sketches to production architecture docs.
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each features as feature, i (feature.title)}
          {#if mounted}
            {@const Icon = feature.icon}
            <div
              class="feature-card group"
              style="--card-glow: {feature.glow}"
              in:fly={{ y: 20, duration: 450, delay: 120 + i * 80, easing: cubicOut }}>
              <div
                class="mb-5 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br {feature.color} shadow-lg shadow-black/10 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                <Icon class="size-5 text-white" />
              </div>
              <h3 class="mb-2.5 text-base font-semibold text-foreground">{feature.title}</h3>
              <p class="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          {/if}
        {/each}
      </div>
    </section>

    <!-- How it works -->
    <section class="mx-auto max-w-5xl border-t border-border px-5 py-28 sm:px-8 md:px-10">
      <div class="mb-20 text-center">
        <h2 class="section-heading">How it works</h2>
        <div
          class="mx-auto mt-5 h-px w-16 bg-gradient-to-r from-transparent via-primary to-transparent">
        </div>
      </div>

      <div class="grid gap-12 md:grid-cols-3 md:gap-8">
        {#each steps as item, i (item.step)}
          {#if mounted}
            <div
              class="relative"
              in:fly={{ y: 20, duration: 450, delay: 200 + i * 120, easing: cubicOut }}>
              <span class="step-number">{item.step}</span>
              <h3 class="mt-4 mb-3 text-base font-semibold text-foreground">{item.title}</h3>
              <p class="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
            </div>
          {/if}
        {/each}
      </div>
    </section>

    <!-- Built with -->
    <section
      class="mx-auto max-w-5xl border-t border-border px-5 py-28 text-center sm:px-8 md:px-10">
      <h2 class="mb-3 text-xl font-bold tracking-tight text-foreground">Built with</h2>
      <p class="mb-12 text-sm text-muted-foreground">Modern stack, open source all the way down.</p>
      <div class="flex flex-wrap items-center justify-center gap-3">
        {#each stack as tech (tech.name)}
          <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
          <a href={tech.url} target="_blank" rel="noopener noreferrer" class="tech-chip"
            >{tech.name}</a>
        {/each}
      </div>
    </section>

    <!-- CTA -->
    <section
      class="mx-auto max-w-4xl border-t border-border px-5 py-28 text-center sm:px-8 md:px-10">
      <h2 class="text-[clamp(1.5rem,5vw,2.5rem)] font-bold tracking-tight text-foreground">
        Ready to diagram?
      </h2>
      <p class="mt-5 text-base text-muted-foreground">
        Sign in, create a workspace, and start building.
      </p>
      <div class="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
        <a
          href={resolve('/dashboard')}
          class="btn-primary min-w-[220px] justify-center py-3 text-sm">
          Go to Dashboard
          <ArrowRight class="size-4" />
        </a>
        <a
          href="https://github.com/omkarbhad/graphini"
          target="_blank"
          rel="noopener"
          class="btn-glass min-w-[220px] justify-center">
          <Github class="size-4" />
          View Source
        </a>
      </div>
    </section>
  </main>

  <!-- Footer -->
  <footer class="border-t border-border px-5 py-14 sm:px-8 md:px-10">
    <div class="mx-auto max-w-6xl">
      <div class="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
        <div class="sm:col-span-2 md:col-span-1">
          <div class="mb-4 flex items-center gap-2">
            <img src="/brand/logo.png" alt="Graphini" class="size-6 rounded-md" />
            <span class="text-sm font-semibold text-foreground">Graphini</span>
          </div>
          <p class="text-sm leading-relaxed text-muted-foreground">
            AI-powered diagram workspace.<br />Describe it, see it, ship it.
          </p>
        </div>
        <div>
          <h4 class="footer-heading">Product</h4>
          <ul class="space-y-2.5">
            <li><a href={resolve('/dashboard')} class="footer-link">Dashboard</a></li>
            <li><a href={resolve('/dashboard')} class="footer-link">Dashboard</a></li>
            <li><a href={resolve('/dashboard')} class="footer-link">Workspaces</a></li>
          </ul>
        </div>
        <div>
          <h4 class="footer-heading">Open Source</h4>
          <ul class="space-y-2.5">
            <li>
              <a
                href="https://github.com/omkarbhad/graphini"
                target="_blank"
                rel="noopener"
                class="footer-link">GitHub</a>
            </li>
            <li>
              <a
                href="https://github.com/omkarbhad/graphini/blob/main/CONTRIBUTING.md"
                target="_blank"
                rel="noopener"
                class="footer-link">Contributing</a>
            </li>
            <li>
              <a
                href="https://github.com/omkarbhad/graphini/blob/main/LICENSE"
                target="_blank"
                rel="noopener"
                class="footer-link">MIT License</a>
            </li>
          </ul>
        </div>
        <div>
          <h4 class="footer-heading">Magnova</h4>
          <ul class="space-y-2.5">
            <li>
              <a href="https://magnova.ai" target="_blank" rel="noopener" class="footer-link"
                >magnova.ai</a>
            </li>
            <li>
              <a
                href="https://astrova.magnova.ai"
                target="_blank"
                rel="noopener"
                class="footer-link">Astrova</a>
            </li>
          </ul>
        </div>
      </div>
      <div
        class="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
        <p class="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Graphini by
          <a
            href="https://magnova.ai"
            target="_blank"
            rel="noopener"
            class="transition-colors hover:text-foreground">Magnova</a
          >. Open source under MIT.
        </p>
        <div class="flex items-center gap-1 text-xs text-muted-foreground">
          Built with <Heart class="mx-0.5 inline size-3 text-rose-500/50" /> by
          <a
            href="https://github.com/omkarbhad"
            target="_blank"
            rel="noopener"
            class="ml-1 transition-colors hover:text-foreground">Omkar Bhad</a>
        </div>
      </div>
    </div>
  </footer>
</div>

<style>
  @reference "../app.css";

  /* ── Navigation ── */
  .btn-primary {
    @apply inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-all duration-300;
    @apply focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none;
    background: linear-gradient(
      135deg,
      var(--gradient-from) 0%,
      var(--gradient-via) 50%,
      var(--gradient-to) 100%
    );
    box-shadow:
      0 0 20px color-mix(in srgb, var(--gradient-from) 25%, transparent),
      0 4px 16px rgba(0, 0, 0, 0.15);
  }
  .btn-primary:hover {
    box-shadow:
      0 0 30px color-mix(in srgb, var(--gradient-from) 40%, transparent),
      0 6px 24px rgba(0, 0, 0, 0.2);
    transform: translateY(-1px);
  }

  .btn-glass {
    @apply inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-300;
    @apply focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none;
    background: var(--color-card);
    border: 1px solid var(--color-border);
    backdrop-filter: blur(12px);
  }
  .btn-glass:hover {
    background: var(--color-accent);
    border-color: var(--color-border);
    color: var(--color-foreground);
  }

  .prompt-chip {
    @apply cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-300;
    @apply focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none;
    border: 1px solid var(--color-border);
    background: var(--color-card);
    color: var(--color-muted-foreground);
  }
  .prompt-chip:hover {
    border-color: var(--color-primary);
    background: var(--color-accent);
    color: var(--color-foreground);
    box-shadow: 0 0 20px color-mix(in srgb, var(--gradient-from) 10%, transparent);
  }

  .surface-chip {
    @apply rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground;
    background: var(--color-card);
    border: 1px solid var(--color-border);
  }

  /* ── Section headings ── */
  .section-heading {
    @apply text-[clamp(1.5rem,4vw,2.5rem)] font-bold tracking-tight text-foreground;
  }

  .step-number {
    @apply block text-5xl font-bold text-primary/20;
  }

  /* ── Feature Cards ── */
  .feature-card {
    @apply relative rounded-xl p-6 transition-all duration-500;
    background: var(--color-card);
    border: 1px solid var(--color-border);
  }
  .feature-card:hover {
    border-color: var(--color-primary);
    transform: translateY(-4px);
    box-shadow:
      0 20px 40px rgba(0, 0, 0, 0.08),
      0 0 60px var(--card-glow);
  }

  /* ── Tech chips ── */
  .tech-chip {
    @apply rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-300;
    @apply focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none;
    background: var(--color-card);
    border: 1px solid var(--color-border);
    color: var(--color-muted-foreground);
  }
  .tech-chip:hover {
    border-color: var(--color-primary);
    background: var(--color-accent);
    color: var(--color-foreground);
    box-shadow: 0 0 20px color-mix(in srgb, var(--gradient-from) 10%, transparent);
  }

  /* ── Footer ── */
  .footer-heading {
    @apply mb-4 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase;
  }
  .footer-link {
    @apply text-sm text-muted-foreground transition-colors hover:text-foreground;
  }

  /* ── Marquee ── */
  @keyframes scroll {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-33.33%);
    }
  }
  .marquee-track {
    animation: scroll 40s linear infinite;
  }
  .marquee-track:hover {
    animation-play-state: paused;
  }
</style>
