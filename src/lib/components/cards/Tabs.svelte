<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import type { Tab } from '$lib/types';
  import { fade } from 'svelte/transition';

  export let tabs: Tab[] = [];
  export let activeTabID: string | undefined;
  export let onselect: ((tab: Tab) => void) | undefined;

  if (!activeTabID && tabs.length > 0) {
    activeTabID = tabs[0].id;
  }

  const toggleTabs = (tab: Tab) => {
    return (event: Event) => {
      event.stopPropagation();
      onselect?.(tab);
    };
  };
</script>

<div class="flex w-fit cursor-default items-center gap-2">
  <ul class="flex gap-2 align-middle" transition:fade>
    {#each tabs as tab, index (tab.id)}
      <Button
        role="tab"
        variant="ghost"
        class={['px-2', activeTabID === tab.id && 'rounded-b-none border-b-2 border-b-primary/40']}
        onclick={toggleTabs(tab)}
        onkeydown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            toggleTabs(tab)(event);
          }
        }}>
        <tab.icon />
      </Button>

      {#if index < tabs.length - 1}
        <div class="my-2">
          <Separator orientation="vertical" class="w-px bg-border" />
        </div>
      {/if}
    {/each}
  </ul>
</div>
