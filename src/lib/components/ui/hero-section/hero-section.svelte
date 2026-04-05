<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { ArrowRight, Phone } from 'lucide-svelte';
  import { resolve } from '$app/paths';

  interface Props {
    class?: string;
  }

  let { class: className }: Props = $props();
</script>

<section class={cn('mx-auto w-full max-w-5xl overflow-hidden pt-16', className)}>
  <!-- Shades -->
  <div aria-hidden="true" class="absolute inset-0 size-full overflow-hidden">
    <div class="absolute inset-0 isolate -z-10 bg-[radial-gradient(20%_80%_at_20%_0%,var(--color-foreground)/.08,transparent)]"></div>
  </div>

  <div class="relative z-10 flex max-w-2xl flex-col gap-5 px-4">
    <!-- Badge -->
    <a
      class="group flex w-fit animate-in fade-in slide-in-from-bottom-10 items-center gap-3 rounded-md border bg-card p-1 shadow-xs fill-mode-backwards transition-all delay-500 duration-500 ease-out"
      href={resolve('/canvas')}>
      <div class="rounded-sm border bg-card px-1.5 py-0.5 shadow-sm">
        <p class="font-mono text-xs font-medium">NEW</p>
      </div>
      <span class="text-xs text-muted-foreground">AI-powered diagramming is here</span>
      <span class="block h-5 border-l"></span>
      <div class="pr-1">
        <ArrowRight class="size-3 -translate-x-0.5 duration-150 ease-out group-hover:translate-x-0.5" />
      </div>
    </a>

    <!-- Heading -->
    <h1 class="animate-in fade-in slide-in-from-bottom-10 text-balance text-4xl font-medium leading-tight text-foreground fill-mode-backwards delay-100 duration-500 ease-out md:text-5xl">
      Turn Ideas Into Diagrams That Drive Clarity
    </h1>

    <!-- Description -->
    <p class="animate-in fade-in slide-in-from-bottom-10 text-sm tracking-wider text-muted-foreground fill-mode-backwards delay-200 duration-500 ease-out sm:text-lg md:text-xl">
      Describe what you need in plain English or Mermaid DSL.
      Graphini renders it live, saves your work, and lets you export anywhere.
    </p>

    <!-- Buttons -->
    <div class="animate-in fade-in slide-in-from-bottom-10 flex w-fit items-center justify-center gap-3 fill-mode-backwards pt-2 delay-300 duration-500 ease-out">
      <Button variant="outline" href={resolve('/edit')}>
        <Phone class="mr-2 size-4" />
        Try Editor
      </Button>
      <Button href={resolve('/dashboard')}>
        Get Started
        <ArrowRight class="ml-2 size-4" />
      </Button>
    </div>
  </div>

  <!-- App Screenshot -->
  <div class="relative">
    <div class="absolute -inset-x-20 inset-y-0 -translate-y-1/3 scale-120 rounded-full bg-[radial-gradient(ellipse_at_center,var(--color-foreground)/.08,transparent,transparent)] blur-[50px]"></div>
    <div class="animate-in fade-in slide-in-from-bottom-5 relative mt-8 overflow-hidden px-2 fill-mode-backwards delay-100 duration-1000 ease-out sm:mt-12 md:mt-20" style="mask-image: linear-gradient(to bottom, black 60%, transparent);">
      <div class="relative mx-auto max-w-5xl overflow-hidden rounded-lg border bg-background p-2 shadow-xl ring-1 ring-card">
        <img
          alt="Graphini app screenshot"
          class="z-2 aspect-video rounded-lg border dark:hidden"
          height="1080"
          src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&h=1080&fit=crop&q=80"
          width="1920" />
        <img
          alt="Graphini app screenshot"
          class="hidden aspect-video rounded-lg bg-background dark:block"
          height="1080"
          src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&h=1080&fit=crop&q=80"
          width="1920" />
      </div>
    </div>
  </div>
</section>
