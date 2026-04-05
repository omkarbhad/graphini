<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
  } from '$lib/components/ui/tooltip';
  import { customColors, selectedPreset, themeActions } from '$lib/stores/diagram-theme';
  import { THEME_PRESETS } from '$lib/themes';
  import { cn } from '$lib/util';
  import {
    Brush,
    Droplet,
    Eye,
    EyeOff,
    Grid3x3,
    Palette,
    RefreshCw,
    Sparkles
  } from '@lucide/svelte';

  let {
    collapsed = false,
    position = 'left'
  }: {
    collapsed?: boolean;
    position?: 'left' | 'right';
  } = $props();

  let showGrid = $state(true);
  let colorizeEnabled = $state(true);

  // Convert THEME_PRESETS to array for iteration
  const presetEntries = Object.entries(THEME_PRESETS) as [
    keyof typeof THEME_PRESETS,
    (typeof THEME_PRESETS)[keyof typeof THEME_PRESETS]
  ][];

  const applyPreset = (presetName: keyof typeof THEME_PRESETS) => {
    themeActions.applyPreset(presetName);
  };

  const randomizeColors = () => {
    themeActions.generateRandomColors();
  };

  const resetColors = () => {
    themeActions.reset();
  };

  const toggleGrid = () => {
    showGrid = !showGrid;
    // Dispatch grid toggle event for diagram components
    window.dispatchEvent(new CustomEvent('toggle-grid', { detail: showGrid }));
  };

  const toggleColorize = () => {
    colorizeEnabled = !colorizeEnabled;
    // Dispatch colorize toggle event for diagram components
    window.dispatchEvent(new CustomEvent('toggle-colorize', { detail: colorizeEnabled }));
  };

  const addCustomColor = () => {
    const input = document.createElement('input');
    input.type = 'color';
    input.onchange = (e) => {
      const color = (e.target as any).value;
      themeActions.addCustomColor(color);
    };
    input.click();
  };

  const removeCustomColor = (index: number) => {
    themeActions.removeCustomColor(index);
  };

  const updateCustomColor = (index: number, color: string) => {
    themeActions.updateCustomColor(index, color);
  };

  const sidebarClasses = $derived(
    cn(
      'flex flex-col h-full bg-background border-border transition-all duration-300 ease-in-out z-40',
      collapsed ? 'w-16' : 'w-80',
      position === 'left' ? 'border-r' : 'border-l border-l-0 border-r',
      'shadow-lg'
    )
  );
</script>

<TooltipProvider>
  <div class={sidebarClasses}>
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-border p-4">
      {#if !collapsed}
        <div class="flex items-center gap-2">
          <Palette class="h-5 w-5 text-primary" />
          <h2 class="text-lg font-semibold text-foreground">Color Studio</h2>
        </div>
      {/if}
      {#if collapsed}
        <Palette class="mx-auto h-5 w-5 text-primary" />
      {/if}
    </div>

    <!-- Color Controls -->
    <div class="flex-1 space-y-4 overflow-auto p-4">
      <!-- Colorize Toggle -->
      <div class="flex items-center justify-between">
        {#if !collapsed}
          <div class="flex items-center gap-2">
            <Brush class="h-4 w-4" />
            <span class="text-sm font-medium">Colorize</span>
          </div>
        {/if}
        <Button
          size={collapsed ? 'icon' : 'sm'}
          variant={colorizeEnabled ? 'default' : 'outline'}
          onclick={toggleColorize}>
          {#if colorizeEnabled}
            <Eye class="h-4 w-4" />
          {:else}
            <EyeOff class="h-4 w-4" />
          {/if}
          {#if !collapsed}
            Enabled
          {/if}
        </Button>
      </div>

      <!-- Grid Toggle -->
      <div class="flex items-center justify-between">
        {#if !collapsed}
          <div class="flex items-center gap-2">
            <Grid3x3 class="h-4 w-4" />
            <span class="text-sm font-medium">Grid</span>
          </div>
        {/if}
        <Button
          size={collapsed ? 'icon' : 'sm'}
          variant={showGrid ? 'default' : 'outline'}
          onclick={toggleGrid}>
          {#if showGrid}
            <Eye class="h-4 w-4" />
          {:else}
            <EyeOff class="h-4 w-4" />
          {/if}
          {#if !collapsed}
            Show
          {/if}
        </Button>
      </div>

      <Separator />

      <!-- Color Presets -->
      {#if !collapsed}
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <Sparkles class="h-4 w-4" />
            <h3 class="text-sm font-semibold">Presets</h3>
          </div>

          <div class="grid grid-cols-1 gap-2">
            {#each presetEntries as [presetName, presetConfig]}
              <button
                type="button"
                class="cursor-pointer rounded-lg border border-border p-3 text-left transition-all hover:border-primary hover:shadow-sm {$selectedPreset ===
                presetName
                  ? 'border-primary bg-primary/5'
                  : ''}"
                onclick={() => applyPreset(presetName)}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    applyPreset(presetName);
                  }
                }}>
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-sm font-medium capitalize">{presetName}</span>
                  {#if $selectedPreset === presetName}
                    <div class="h-2 w-2 rounded-full bg-primary"></div>
                  {/if}
                </div>
                <div class="mb-1 flex gap-1">
                  <div
                    class="h-4 w-4 rounded-full border border-border"
                    style="background-color: {presetConfig.primaryColor}">
                  </div>
                  <div
                    class="h-4 w-4 rounded-full border border-border"
                    style="background-color: {presetConfig.secondaryColor}">
                  </div>
                  <div
                    class="h-4 w-4 rounded-full border border-border"
                    style="background-color: {presetConfig.tertiaryColor}">
                  </div>
                  <div
                    class="h-4 w-4 rounded-full border border-border"
                    style="background-color: {presetConfig.border1}">
                  </div>
                  <div
                    class="h-4 w-4 rounded-full border border-border"
                    style="background-color: {presetConfig.border2}">
                  </div>
                  <div
                    class="h-4 w-4 rounded-full border border-border"
                    style="background-color: {presetConfig.mainBkg}">
                  </div>
                </div>
                <p class="text-xs text-muted-foreground capitalize">{presetName} theme</p>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Collapsed Mode - Quick Presets -->
      {#if collapsed}
        <div class="space-y-2">
          {#each presetEntries.slice(0, 4) as [presetName, presetConfig]}
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-full"
                  onclick={() => applyPreset(presetName)}>
                  <div
                    class="grid h-4 w-4 grid-cols-2 gap-0.5 rounded-full border border-border p-0.5">
                    <div style="background-color: {presetConfig.primaryColor}"></div>
                    <div style="background-color: {presetConfig.secondaryColor}"></div>
                    <div style="background-color: {presetConfig.tertiaryColor}"></div>
                    <div style="background-color: {presetConfig.border1}"></div>
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side={position === 'left' ? 'right' : 'left'}>
                <p class="capitalize">{presetName}</p>
              </TooltipContent>
            </Tooltip>
          {/each}
        </div>
      {/if}

      <Separator />

      <!-- Custom Colors -->
      {#if !collapsed}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Droplet class="h-4 w-4" />
              <h3 class="text-sm font-semibold">Custom</h3>
            </div>
            <div class="flex gap-1">
              <Button size="icon" variant="outline" onclick={addCustomColor}>
                <Sparkles class="h-3 w-3" />
              </Button>
              <Button size="icon" variant="outline" onclick={randomizeColors}>
                <RefreshCw class="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            {#each $customColors as color, index}
              <div class="group relative">
                <button
                  type="button"
                  class="h-8 w-8 cursor-pointer rounded-lg border-2 border-border transition-colors hover:border-primary"
                  style="background-color: {color}"
                  onclick={() => {
                    const input = document.createElement('input');
                    input.type = 'color';
                    input.onchange = (e) => {
                      const newColor = (e.target as any).value;
                      updateCustomColor(index, newColor);
                    };
                    input.click();
                  }}
                  onkeydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      const input = document.createElement('input');
                      input.type = 'color';
                      input.onchange = (ev) => {
                        const newColor = (ev.target as any).value;
                        updateCustomColor(index, newColor);
                      };
                      input.click();
                    }
                  }}
                  aria-label={`Edit color ${index + 1}`}>
                </button>
                <Button
                  size="icon"
                  variant="destructive"
                  class="absolute -top-2 -right-2 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
                  onclick={() => removeCustomColor(index)}>
                  ×
                </Button>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Actions -->
      {#if !collapsed}
        <div class="space-y-2 pt-4">
          <Button variant="outline" size="sm" class="w-full" onclick={resetColors}>
            <RefreshCw class="mr-2 h-4 w-4" />
            Reset to Default
          </Button>
        </div>
      {/if}
    </div>
  </div>
</TooltipProvider>

<style>
  /* Sidebar animations */
  .sidebar-enter {
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* Hover effects */
  .color-preset:hover {
    transform: scale(1.05);
    transition: transform 0.2s ease;
  }

  .custom-color-item:hover {
    transform: scale(1.1);
    transition: transform 0.2s ease;
  }
</style>
