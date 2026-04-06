<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { ArrowRight, Github } from 'lucide-svelte';
  import { resolve } from '$app/paths';

  interface Props {
    class?: string;
  }

  let { class: className }: Props = $props();
</script>

<section class={cn('mx-auto w-full max-w-5xl pt-16', className)}>
  <div class="relative z-10 flex max-w-2xl flex-col gap-5 px-4">
    <!-- Badge -->
    <a
      class="group flex w-fit animate-in items-center gap-3 rounded-md border bg-card p-1 shadow-xs transition-all delay-500 duration-500 ease-out fill-mode-backwards slide-in-from-bottom-10 fade-in"
      href={resolve('/dashboard')}>
      <div class="rounded-sm border bg-card px-1.5 py-0.5 shadow-sm">
        <p class="font-mono text-xs font-medium">NEW</p>
      </div>
      <span class="text-xs text-muted-foreground">AI-powered diagramming is here</span>
      <span class="block h-5 border-l"></span>
      <div class="pr-1">
        <ArrowRight
          class="size-3 -translate-x-0.5 duration-150 ease-out group-hover:translate-x-0.5" />
      </div>
    </a>

    <!-- Heading -->
    <h1
      class="animate-in text-4xl leading-tight font-medium text-balance text-foreground delay-100 duration-500 ease-out fill-mode-backwards slide-in-from-bottom-10 fade-in md:text-5xl">
      Turn Ideas Into Diagrams That Drive Clarity
    </h1>

    <!-- Description -->
    <p
      class="animate-in text-base leading-relaxed text-muted-foreground delay-200 duration-500 ease-out fill-mode-backwards slide-in-from-bottom-10 fade-in sm:text-lg md:text-xl">
      Describe what you need in plain English or Mermaid DSL. Graphini renders it live, saves your
      work, and lets you export anywhere.
    </p>

    <!-- Buttons -->
    <div
      class="flex w-fit animate-in items-center justify-center gap-3 pt-2 delay-300 duration-500 ease-out fill-mode-backwards slide-in-from-bottom-10 fade-in">
      <Button href={resolve('/dashboard')}>
        Get Started
        <ArrowRight class="ml-2 size-4" />
      </Button>
      <Button
        variant="outline"
        href="https://github.com/omkarbhad/graphini"
        target="_blank"
        rel="noopener">
        <Github class="mr-2 size-4" />
        View Source
      </Button>
    </div>
  </div>

  <!-- App Preview -->
  <div
    class="relative mt-8 animate-in overflow-hidden px-2 delay-100 duration-1000 ease-out fill-mode-backwards slide-in-from-bottom-5 fade-in sm:mt-12 md:mt-20"
    style="mask-image: linear-gradient(to bottom, black 60%, transparent);">
    <div class="mx-auto max-w-5xl overflow-hidden rounded-xl border border-border">
      <img src="/brand/app-preview.png" alt="Graphini workspace" class="w-full" />
    </div>
  </div>
</section>
