<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { resolve } from '$app/paths';
  import { authStore } from '$lib/stores/auth.svelte.js';
  import { onMount } from 'svelte';
  import {
    Github,
    Code2,
    Globe,
    Layers,
    UserPlus,
    BarChart3,
    Plug,
    Users,
    Star,
    Handshake,
    FileText,
    Shield,
    RotateCcw,
    Leaf,
    HelpCircle,
    Menu,
    X
  } from 'lucide-svelte';

  let scrolled = $state(false);
  let mobileOpen = $state(false);

  onMount(() => {
    function onScroll() {
      scrolled = window.scrollY > 10;
    }
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  });

  $effect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });

  const productLinks = [
    {
      title: 'AI Diagrams',
      href: '/edit',
      description: 'Generate diagrams from plain English',
      icon: Code2
    },
    {
      title: 'Infinite Canvas',
      href: '/canvas',
      description: 'Pan, zoom, and arrange freely',
      icon: Globe
    },
    {
      title: 'Workspaces',
      href: '/dashboard',
      description: 'Organize and manage your diagrams',
      icon: Layers
    },
    {
      title: 'Collaboration',
      href: '/canvas',
      description: 'Work together in real-time',
      icon: UserPlus
    },
    {
      title: 'Export & Share',
      href: '/edit',
      description: 'SVG, PNG, or raw Mermaid code',
      icon: BarChart3
    },
    {
      title: 'API',
      href: 'https://github.com/omkarbhad/graphini',
      description: 'Build custom integrations',
      icon: Plug
    }
  ];

  const companyLinks = [
    {
      title: 'About Magnova',
      href: 'https://magnova.ai',
      description: 'Learn more about our mission',
      icon: Users
    },
    {
      title: 'Open Source',
      href: 'https://github.com/omkarbhad/graphini',
      description: 'Fork it, extend it, self-host it',
      icon: Star
    },
    {
      title: 'Contributing',
      href: 'https://github.com/omkarbhad/graphini/blob/main/CONTRIBUTING.md',
      description: 'Help us build Graphini',
      icon: Handshake
    }
  ];

  const companyLinks2 = [
    { title: 'MIT License', href: 'https://github.com/omkarbhad/graphini/blob/main/LICENSE', icon: FileText },
    { title: 'Security', href: 'https://github.com/omkarbhad/graphini/blob/main/SECURITY.md', icon: Shield },
    { title: 'Changelog', href: 'https://github.com/omkarbhad/graphini/blob/main/CHANGELOG.md', icon: RotateCcw },
    { title: 'Blog', href: 'https://magnova.ai', icon: Leaf },
    { title: 'Help', href: 'https://github.com/omkarbhad/graphini/issues', icon: HelpCircle }
  ];
</script>

<header
  class={cn('sticky top-0 z-50 w-full border-b border-transparent', {
    'border-border bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/50':
      scrolled
  })}>
  <nav class="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
    <div class="flex items-center gap-5">
      <a href={resolve('/')} class="flex items-center gap-2 rounded-md p-2 hover:bg-accent">
        <img src="/brand/logo.png" alt="Graphini" class="size-7 rounded-lg" />
        <span class="text-sm font-semibold tracking-tight">Graphini</span>
      </a>

      <!-- Desktop nav links -->
      <div class="hidden items-center gap-1 md:flex">
        <a
          href={resolve('/edit')}
          class="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
          Editor
        </a>
        <a
          href={resolve('/canvas')}
          class="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
          Canvas
        </a>
        <a
          href={resolve('/dashboard')}
          class="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
          Dashboard
        </a>
        <a
          href="https://github.com/omkarbhad/graphini"
          target="_blank"
          rel="noopener"
          class="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
          <Github class="size-4" />
          GitHub
        </a>
      </div>
    </div>

    <!-- Desktop buttons -->
    <div class="hidden items-center gap-2 md:flex">
      {#if authStore.isLoggedIn}
        <Button variant="outline" href={resolve('/dashboard')}>Dashboard</Button>
      {:else}
        <Button variant="outline" onclick={() => authStore.login()}>Sign In</Button>
      {/if}
      <Button href={resolve('/dashboard')}>Get Started</Button>
    </div>

    <!-- Mobile menu toggle -->
    <Button
      variant="outline"
      size="icon"
      class="md:hidden"
      onclick={() => (mobileOpen = !mobileOpen)}
      aria-expanded={mobileOpen}
      aria-controls="mobile-menu"
      aria-label="Toggle menu">
      {#if mobileOpen}
        <X class="size-5" />
      {:else}
        <Menu class="size-5" />
      {/if}
    </Button>
  </nav>

  <!-- Mobile menu -->
  {#if mobileOpen}
    <div
      id="mobile-menu"
      class="fixed inset-x-0 top-14 bottom-0 z-40 flex flex-col overflow-y-auto border-y bg-background/95 backdrop-blur-lg md:hidden supports-[backdrop-filter]:bg-background/50">
      <div class="animate-in zoom-in-97 flex size-full flex-col justify-between gap-2 p-4 ease-out">
        <div class="flex w-full flex-col gap-y-2">
          <span class="text-sm font-medium text-muted-foreground">Product</span>
          {#each productLinks as link (link.title)}
            <a
              href={link.href.startsWith('http') ? link.href : resolve(link.href as '/edit' | '/canvas' | '/dashboard')}
              class="flex flex-row items-center gap-x-2 rounded-md p-2 hover:bg-accent"
              onclick={() => (mobileOpen = false)}>
              <div
                class="flex aspect-square size-12 items-center justify-center rounded-md border bg-background/40 shadow-sm">
                <link.icon class="size-5 text-foreground" />
              </div>
              <div class="flex flex-col items-start justify-center">
                <span class="text-sm font-medium">{link.title}</span>
                {#if link.description}
                  <span class="text-xs text-muted-foreground">{link.description}</span>
                {/if}
              </div>
            </a>
          {/each}

          <span class="mt-2 text-sm font-medium text-muted-foreground">Company</span>
          {#each companyLinks as link (link.title)}
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              class="flex flex-row items-center gap-x-2 rounded-md p-2 hover:bg-accent"
              onclick={() => (mobileOpen = false)}>
              <div
                class="flex aspect-square size-12 items-center justify-center rounded-md border bg-background/40 shadow-sm">
                <link.icon class="size-5 text-foreground" />
              </div>
              <div class="flex flex-col items-start justify-center">
                <span class="text-sm font-medium">{link.title}</span>
                {#if link.description}
                  <span class="text-xs text-muted-foreground">{link.description}</span>
                {/if}
              </div>
            </a>
          {/each}

          {#each companyLinks2 as link (link.title)}
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              class="flex flex-row items-center gap-x-2 rounded-md p-2 hover:bg-accent"
              onclick={() => (mobileOpen = false)}>
              <link.icon class="size-4 text-foreground" />
              <span class="text-sm font-medium">{link.title}</span>
            </a>
          {/each}
        </div>

        <div class="flex flex-col gap-2">
          {#if authStore.isLoggedIn}
            <Button variant="outline" class="w-full bg-transparent" href={resolve('/dashboard')}>
              Dashboard
            </Button>
          {:else}
            <Button
              variant="outline"
              class="w-full bg-transparent"
              onclick={() => authStore.login()}>
              Sign In
            </Button>
          {/if}
          <Button class="w-full" href={resolve('/dashboard')}>Get Started</Button>
        </div>
      </div>
    </div>
  {/if}
</header>
