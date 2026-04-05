<script lang="ts">
  import McWrapper from '$lib/components/McWrapper.svelte';
  import MermaidChartIcon from '$lib/components/MermaidChartIcon.svelte';
  import Navbar from '$lib/components/Navbar.svelte';
  import Share from '$lib/components/Share.svelte';
  import SyncRoughToolbar from '$lib/components/SyncRoughToolbar.svelte';
  import VersionSecurityToolbar from '$lib/components/VersionSecurityToolbar.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Toggle } from '$lib/components/ui/toggle';
  import type { Snippet } from 'svelte';
  import { Eye, EyeOff, Settings } from 'lucide-svelte';

  interface Props {
    mobileToggle?: Snippet;
    historyIcon?: Snippet;
    isHistoryOpen: boolean;
    onHistoryToggle: (pressed: boolean) => void;
    isSidebarVisible: boolean;
    onSidebarToggle: () => void;
    onSettingsToggle: () => void;
    saveDiagramUrl: string;
  }

  let {
    mobileToggle,
    historyIcon,
    isHistoryOpen,
    onHistoryToggle,
    isSidebarVisible,
    onSidebarToggle,
    onSettingsToggle,
    saveDiagramUrl
  }: Props = $props();

  const handleHistoryToggle = (pressed: boolean) => {
    onHistoryToggle(pressed);
  };
</script>

<Navbar {mobileToggle}>
  <div class="flex w-full flex-wrap items-center justify-between gap-3 md:flex-nowrap">
    <div class="flex flex-1 flex-wrap items-center gap-3 md:flex-nowrap">
      <Toggle size="sm" pressed={isHistoryOpen} onPressedChange={handleHistoryToggle}>
        {@render historyIcon?.()}
      </Toggle>
      <Share />
      <Button
        size="icon"
        variant="ghost"
        onclick={onSidebarToggle}
        title={isSidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
        aria-label={isSidebarVisible ? 'Hide sidebar' : 'Show sidebar'}>
        {#if isSidebarVisible}
          <EyeOff class="size-5" />
        {:else}
          <Eye class="size-5" />
        {/if}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onclick={onSettingsToggle}
        title="Settings"
        aria-label="Settings">
        <Settings class="size-5" />
      </Button>
      <SyncRoughToolbar />
      <VersionSecurityToolbar />
    </div>

    <McWrapper>
      <Button variant="secondary" size="sm" href={saveDiagramUrl} target="_blank">
        <MermaidChartIcon />
        Save diagram
      </Button>
    </McWrapper>
  </div>
</Navbar>
