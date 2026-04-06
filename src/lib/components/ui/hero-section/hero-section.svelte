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

<section class={cn('mx-auto w-full max-w-5xl overflow-hidden pt-16', className)}>
  <!-- Shades -->
  <div aria-hidden="true" class="absolute inset-0 size-full overflow-hidden">
    <div
      class="absolute inset-0 isolate -z-10 bg-[radial-gradient(20%_80%_at_20%_0%,var(--color-foreground)/.08,transparent)]">
    </div>
  </div>

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
  <div class="relative">
    <div
      class="absolute -inset-x-20 inset-y-0 -translate-y-1/3 scale-120 rounded-full bg-[radial-gradient(ellipse_at_center,var(--color-foreground)/.08,transparent,transparent)] blur-[50px]">
    </div>
    <div
      class="relative mt-8 animate-in overflow-hidden px-2 delay-100 duration-1000 ease-out fill-mode-backwards slide-in-from-bottom-5 fade-in sm:mt-12 md:mt-20"
      style="mask-image: linear-gradient(to bottom, black 60%, transparent);">
      <div
        class="hero-preview relative mx-auto max-w-5xl overflow-hidden rounded-xl border bg-background/80 p-3 shadow-2xl ring-1 ring-border/50 backdrop-blur-sm">
        <!-- Mock editor UI -->
        <div class="flex gap-3">
          <!-- Editor pane -->
          <div class="hidden flex-1 rounded-lg border border-border/50 bg-muted/30 p-4 sm:block">
            <div class="mb-3 flex items-center gap-2">
              <div class="size-2.5 rounded-full bg-red-400/60"></div>
              <div class="size-2.5 rounded-full bg-amber-400/60"></div>
              <div class="size-2.5 rounded-full bg-green-400/60"></div>
              <span class="ml-2 text-[10px] font-medium text-muted-foreground/50">editor.mmd</span>
            </div>
            <div class="space-y-2 font-mono text-[11px] leading-relaxed">
              <p class="text-muted-foreground/40">graph TD</p>
              <p class="text-muted-foreground/60">
                &nbsp;&nbsp;A[<span class="text-blue-500/70">User Request</span>] --&gt; B
              </p>
              <p class="text-muted-foreground/60">
                &nbsp;&nbsp;B --&gt; C[<span class="text-emerald-500/70">Generate</span>]
              </p>
              <p class="text-muted-foreground/60">
                &nbsp;&nbsp;B --&gt; D[<span class="text-amber-500/70">Validate</span>]
              </p>
              <p class="text-muted-foreground/60">
                &nbsp;&nbsp;C --&gt; E[<span class="text-cyan-500/70">Render</span>]
              </p>
              <p class="text-muted-foreground/60">&nbsp;&nbsp;D --&gt; E</p>
            </div>
          </div>
          <!-- Preview pane -->
          <div
            class="flex flex-1 items-center justify-center rounded-lg border border-border/50 bg-card/50 p-6">
            <div class="flex flex-col items-center gap-3">
              <div
                class="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20">
                <span class="text-xs font-semibold text-blue-500/70">A</span>
              </div>
              <div class="h-4 w-px bg-border/60"></div>
              <div
                class="flex size-10 items-center justify-center rounded-lg bg-purple-500/10 ring-1 ring-purple-500/20">
                <span class="text-xs font-semibold text-purple-500/70">B</span>
              </div>
              <div class="flex gap-6">
                <div class="flex flex-col items-center gap-3">
                  <div class="h-4 w-px bg-border/60"></div>
                  <div
                    class="flex size-8 items-center justify-center rounded-md bg-emerald-500/10 ring-1 ring-emerald-500/20">
                    <span class="text-[10px] font-semibold text-emerald-500/70">C</span>
                  </div>
                </div>
                <div class="flex flex-col items-center gap-3">
                  <div class="h-4 w-px bg-border/60"></div>
                  <div
                    class="flex size-8 items-center justify-center rounded-md bg-amber-500/10 ring-1 ring-amber-500/20">
                    <span class="text-[10px] font-semibold text-amber-500/70">D</span>
                  </div>
                </div>
              </div>
              <div class="h-4 w-px bg-border/60"></div>
              <div
                class="flex size-10 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/20">
                <span class="text-xs font-semibold text-cyan-500/70">E</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
