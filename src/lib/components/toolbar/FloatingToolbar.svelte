<script lang="ts">
  import { TID } from '$/constants';
  import { inputStateStore } from '$/util/state';
  import { logEvent } from '$/util/stats';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import { Toggle } from '$lib/components/ui/toggle';
  import UserLogin from '$lib/components/UserLoginCircle.svelte';
  import { removeIconStylesFromSvg } from '$lib/features/diagram/mermaid';
  import { injectAWSIcons } from '$lib/features/icons/iconInjector';
  import { documentMarkdownStore } from '$lib/stores/documentStore';
  import {
    ChevronDown,
    Download,
    FileCode,
    FileText,
    Image,
    Moon,
    Palette,
    Shapes,
    Sun
  } from 'lucide-svelte';
  import { mode, setMode } from 'mode-watcher';
  import { onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import FlowchartIcon from '~icons/material-symbols/account-tree-outline-rounded';
  import RoughIcon from '~icons/material-symbols/draw-outline-rounded';
  import BackgroundIcon from '~icons/material-symbols/grid-4x4-rounded';
  import RefreshCw from '~icons/material-symbols/refresh';
  import SidebarIcon from '~icons/material-symbols/view-sidebar-outline';

  interface Props {
    isSidebarVisible: boolean;
    onSidebarToggle: () => void;
    isColorSidebarVisible: boolean;
    onColorSidebarToggle: () => void;
  }

  export let isSidebarVisible: boolean;
  export let onSidebarToggle: () => void;
  export let isColorSidebarVisible: boolean;
  export let onColorSidebarToggle: () => void;
  export let isIconSidebarVisible: boolean;
  export let onIconSidebarToggle: () => void;

  const getLayoutSelection = (configString: string) => {
    try {
      const config = JSON.parse(configString);
      const layout = String(config.layout ?? 'elk').toLowerCase();
      if (layout.startsWith('elk')) {
        return 'elk';
      }
    } catch {
      // ignore
    }
    return 'elk';
  };

  let currentState: any;
  let layoutValue: string;
  let isLayoutDropdownOpen = false;

  // Subscribe to store changes
  const unsubscribe = (inputStateStore as any).subscribe((state: any) => {
    currentState = state;
    layoutValue = getLayoutSelection(state?.mermaid ?? '{}');
  });

  const onLayoutChange = (value: string) => {
    if (!value) return;
    try {
      const config = JSON.parse(currentState?.mermaid ?? '{}');
      config.layout = value;
      const store = inputStateStore as any;
      if (store.update) {
        store.update((state) => ({
          ...state,
          mermaid: JSON.stringify(config)
        }));
      } else if (store.set) {
        store.set({
          ...currentState,
          mermaid: JSON.stringify(config)
        });
      }
    } catch {
      // ignore
    }
  };

  const toggleTheme = () => {
    setMode($mode === 'dark' ? 'light' : 'dark');
  };

  // Function to manually run icon processing on current diagram
  const processIcons = () => {
    const container = document.querySelector('#container');
    if (container) {
      const svgElement = container.querySelector('svg') as SVGSVGElement;
      if (svgElement) {
        console.log('[Toolbar] Manual icon processing triggered');
        removeIconStylesFromSvg(svgElement, document.documentElement.classList.contains('dark'));
        injectAWSIcons(svgElement);
        logEvent('render', {
          diagramType: 'manual',
          isRough: false,
          lengthBucket: '0-10',
          renderTimeMsBucket: '0-25'
        });
      }
    }
  };

  // Download helpers
  function downloadFile(filename: string, content: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const downloadSvg = () => {
    const svgEl = document.querySelector('#container svg');
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true) as Element;
    const svgData = new XMLSerializer().serializeToString(clone);
    downloadFile('diagram.svg', svgData, 'image/svg+xml');
    logEvent('download', { type: 'svg' });
  };

  const downloadPng = () => {
    const svgEl = document.querySelector('#container svg') as SVGSVGElement;
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2; // 2x for retina
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = 'diagram.png';
        a.click();
        URL.revokeObjectURL(pngUrl);
      }, 'image/png');
    };
    img.src = url;
    logEvent('download', { type: 'png' });
  };

  const downloadMermaidCode = () => {
    const code = currentState?.code || '';
    if (!code.trim()) return;
    downloadFile('diagram.mmd', code, 'text/plain');
    logEvent('download', { type: 'mermaid' });
  };

  const downloadMarkdown = () => {
    const md = get(documentMarkdownStore);
    if (!md?.trim()) return;
    downloadFile('document.md', md, 'text/markdown');
    logEvent('download', { type: 'markdown' });
  };

  // Close layout dropdown on outside click or Escape
  function handleClickOutside(e: MouseEvent) {
    if (isLayoutDropdownOpen) {
      const target = e.target as Element;
      if (!target.closest('.layout-dropdown-container')) {
        isLayoutDropdownOpen = false;
      }
    }
  }
  function handleEscapeKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && isLayoutDropdownOpen) {
      isLayoutDropdownOpen = false;
    }
  }

  // Cleanup subscription on component destroy
  onDestroy(() => {
    unsubscribe();
  });
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleEscapeKey} />

<!-- Compact Floating Toolbar -->
<div
  class="pointer-events-auto absolute top-4 right-4 z-40 flex items-center gap-0.5 rounded-xl border border-border bg-card/70 px-1 py-1.5 backdrop-blur transition-colors hover:bg-card supports-[backdrop-filter]:bg-card/60">
  <!-- Essential Diagram Controls -->
  <div class="flex items-center gap-0.5">
    <Toggle
      pressed={currentState?.rough}
      onclick={() => {
        const store = inputStateStore as any;
        if (store.set) {
          store.set({
            ...currentState,
            rough: !currentState?.rough
          });
        }
      }}
      size="sm"
      title="Hand-Drawn Style"
      class="h-8 w-8 rounded-md text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground [&_svg]:size-4">
      <RoughIcon />
    </Toggle>

    <Toggle
      pressed={currentState?.grid}
      onclick={() => {
        const store = inputStateStore as any;
        if (store.set) {
          store.set({
            ...currentState,
            grid: !currentState?.grid
          });
        }
      }}
      size="sm"
      title="Background Grid"
      class="h-8 w-8 rounded-md text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground [&_svg]:size-4">
      <BackgroundIcon />
    </Toggle>

    <Separator orientation="vertical" class="mx-0.5 h-5 bg-border/60" />

    <!-- Enhanced Layout Dropdown -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="layout-dropdown-container relative">
      <Button
        variant="ghost"
        size="sm"
        title="Diagram Layout"
        onclick={() => (isLayoutDropdownOpen = !isLayoutDropdownOpen)}
        class="h-7 gap-1 rounded-lg text-muted-foreground/70 transition-all duration-300 hover:scale-105 hover:bg-primary/10 hover:text-primary [&_svg]:size-3.5 {isLayoutDropdownOpen
          ? 'bg-primary/10 text-primary shadow-sm'
          : ''}">
        <FlowchartIcon
          class="transition-transform duration-300 {isLayoutDropdownOpen ? 'scale-110' : ''}" />
        <span class="text-[10px] font-semibold transition-colors duration-300"
          >{layoutValue === 'elk' ? 'ELK' : 'Dagre'}</span>
        <ChevronDown
          class="size-2 transition-all duration-300 {isLayoutDropdownOpen
            ? 'scale-110 rotate-180'
            : ''}" />
      </Button>

      <!-- Compact Dropdown Menu -->
      {#if isLayoutDropdownOpen}
        <div
          class="absolute top-full right-0 z-50 mt-1 min-w-[120px] animate-in rounded-lg border border-border bg-background p-1 shadow-lg duration-150 fade-in-0 zoom-in-95">
          <!-- Dagre Option -->
          <button
            class="group flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[10px] transition-all duration-150 hover:bg-muted/80 {layoutValue ===
            'dagre'
              ? 'bg-muted/60 text-foreground'
              : 'text-muted-foreground/80'}"
            onclick={() => {
              onLayoutChange('dagre');
              isLayoutDropdownOpen = false;
            }}>
            <div class="relative flex-shrink-0">
              <div
                class="flex h-3.5 w-3.5 items-center justify-center rounded-md border border-green-500/30 bg-gradient-to-br from-emerald-500/20 to-green-600/20 transition-colors group-hover:border-green-500/50">
                <FlowchartIcon
                  class="h-2 w-2 text-green-600 transition-colors group-hover:text-green-700" />
              </div>
              {#if layoutValue === 'dagre'}
                <div
                  class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-background bg-green-500 shadow-sm">
                </div>
              {/if}
            </div>
            <div class="flex min-w-0 flex-col">
              <span class="text-[11px] font-medium">Dagre</span>
              <span class="text-[8px] text-muted-foreground/60">Hierarchical</span>
            </div>
          </button>

          <!-- ELK Option -->
          <button
            class="group flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[10px] transition-all duration-150 hover:bg-muted/80 {layoutValue ===
            'elk'
              ? 'bg-muted/60 text-foreground'
              : 'text-muted-foreground/80'}"
            onclick={() => {
              onLayoutChange('elk');
              isLayoutDropdownOpen = false;
            }}>
            <div class="relative flex-shrink-0">
              <div
                class="flex h-3.5 w-3.5 items-center justify-center rounded-md border border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-purple-600/20 transition-colors group-hover:border-blue-500/50">
                <div
                  class="h-1.5 w-1.5 rounded-full bg-blue-600 transition-colors group-hover:bg-blue-700">
                </div>
              </div>
              {#if layoutValue === 'elk'}
                <div
                  class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-background bg-blue-500 shadow-sm">
                </div>
              {/if}
            </div>
            <div class="flex min-w-0 flex-col">
              <span class="text-[11px] font-medium">ELK</span>
              <span class="text-[8px] text-muted-foreground/60">Force-directed</span>
            </div>
          </button>

          <!-- Divider -->
          <div class="my-1 border-t border-border"></div>

          <!-- Current Selection -->
          <div class="px-2 py-1 text-center text-[8px] text-muted-foreground/60">
            {layoutValue === 'elk' ? 'ELK Layout' : 'Dagre Layout'}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <Separator orientation="vertical" class="mx-0.5 h-5 bg-border/60" />

  <!-- Core UI Controls -->
  <div class="flex items-center gap-0.5">
    <Toggle
      pressed={isColorSidebarVisible}
      onclick={onColorSidebarToggle}
      title="Color Palette"
      class="h-7 w-7 rounded-md text-muted-foreground transition-all duration-200 hover:bg-accent/50 hover:text-accent-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:size-3.5">
      <Palette class="size-3.5" />
    </Toggle>

    <Toggle
      pressed={isSidebarVisible}
      onclick={onSidebarToggle}
      title="Code Editor"
      class="h-7 w-7 rounded-md text-muted-foreground transition-all duration-200 hover:bg-accent/50 hover:text-accent-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:size-3.5">
      <SidebarIcon class="size-3.5" />
    </Toggle>

    <Button
      variant="ghost"
      size="icon"
      title="Save as PNG"
      onclick={downloadPng}
      class="h-7 w-7 rounded-md text-muted-foreground transition-all duration-200 hover:bg-accent/50 hover:text-accent-foreground [&_svg]:size-3.5">
      <Image class="size-3.5" />
    </Button>

    <Button
      variant="ghost"
      size="icon"
      title="Download SVG"
      onclick={downloadSvg}
      class="h-7 w-7 rounded-md text-muted-foreground transition-all duration-200 hover:bg-accent/50 hover:text-accent-foreground [&_svg]:size-3.5">
      <Download class="size-3.5" />
    </Button>

    <Button
      variant="ghost"
      size="icon"
      title="Download Mermaid Code"
      onclick={downloadMermaidCode}
      class="h-7 w-7 rounded-md text-muted-foreground transition-all duration-200 hover:bg-accent/50 hover:text-accent-foreground [&_svg]:size-3.5">
      <FileCode class="size-3.5" />
    </Button>

    <Button
      variant="ghost"
      size="icon"
      title="Download Markdown"
      onclick={downloadMarkdown}
      class="h-7 w-7 rounded-md text-muted-foreground transition-all duration-200 hover:bg-accent/50 hover:text-accent-foreground [&_svg]:size-3.5">
      <FileText class="size-3.5" />
    </Button>

    <Separator orientation="vertical" class="mx-0.5 h-5 bg-border/60" />

    <Button
      variant="ghost"
      size="icon"
      data-testid={TID.themeToggleButton}
      title="Switch to {$mode === 'dark' ? 'light' : 'dark'} theme"
      onclick={toggleTheme}
      class="h-7 w-7 rounded-md text-muted-foreground transition-all duration-200 hover:bg-accent/50 hover:text-accent-foreground [&_svg]:size-3.5">
      {#if $mode === 'dark'}
        <Sun class="size-3.5" />
      {:else}
        <Moon class="size-3.5" />
      {/if}
    </Button>

    <Button
      variant="ghost"
      size="icon"
      title="Fix Icon Colors"
      onclick={processIcons}
      class="h-7 w-7 rounded-md text-muted-foreground transition-all duration-200 hover:bg-accent/50 hover:text-accent-foreground [&_svg]:size-3.5">
      <RefreshCw class="size-3.5" />
    </Button>

    <Toggle
      pressed={isIconSidebarVisible}
      onclick={onIconSidebarToggle}
      title="Icon Library"
      class="h-7 w-7 rounded-md text-muted-foreground transition-all duration-200 hover:bg-accent/50 hover:text-accent-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:size-3.5">
      <Shapes class="size-3.5" />
    </Toggle>

    <Separator orientation="vertical" class="mx-0.5 h-5 bg-border/60" />

    <UserLogin />
  </div>
</div>
