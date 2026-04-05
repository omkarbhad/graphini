<script lang="ts" module>
  import { logEvent, plausible } from '$lib/util/stats';
  import { version } from 'mermaid/package.json';

  void logEvent('version', {
    mermaidVersion: version
  });
</script>

<script lang="ts">
  import MainMenu from '$lib/components/MainMenu.svelte';
  import { Button } from '$lib/components/ui/button';
  import { dismissPromotion, getActivePromotion } from '$lib/util/promos/promo';
  import { MCBaseURL } from '$lib/util/util';
  import type { ComponentProps, Snippet } from 'svelte';
  import CloseIcon from '~icons/material-symbols/close-rounded';
  import DropdownNavMenu from './DropdownNavMenu.svelte';

  interface Props {
    mobileToggle?: Snippet;
    children: Snippet;
  }

  let { children, mobileToggle }: Props = $props();

  const isReferral = document.referrer.includes(MCBaseURL);

  type Links = ComponentProps<typeof DropdownNavMenu>['links'];

  const githubLinks: Links = [
    { title: 'Mermaid JS', href: 'https://github.com/mermaid-js/mermaid' },
    {
      title: 'Mermaid Live Editor',
      href: 'https://github.com/mermaid-js/mermaid-live-editor'
    },
    {
      title: 'Mermaid CLI',
      href: 'https://github.com/mermaid-js/mermaid-cli'
    }
  ];

  let activePromotion = $state(getActivePromotion());

  const trackBannerClick = () => {
    if (!plausible || !activePromotion) {
      return;
    }
    logEvent('bannerClick', {
      promotion: activePromotion.id
    });
  };
</script>

{#if activePromotion}
  <div class="top-bar z-10 flex h-fit w-full bg-primary">
    <div
      class="flex flex-grow"
      role="button"
      tabindex="0"
      onclick={trackBannerClick}
      onkeypress={trackBannerClick}>
      <activePromotion.component {closeBanner} />
    </div>
    {#snippet closeBanner()}
      <Button
        title="Dismiss banner"
        variant="ghost"
        class="hover:bg-transparent"
        size="sm"
        onclick={() => {
          dismissPromotion(activePromotion?.id);
          activePromotion = undefined;
        }}>
        <CloseIcon />
      </Button>
    {/snippet}
  </div>
{/if}

<nav
  class="sticky top-0 z-50 flex w-full border-b border-border bg-background/70 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6 sm:py-3">
  <div class="flex flex-1 items-center gap-2">
    <MainMenu />
    <img src="/brand/logo.png" alt="Graphini" class="size-6" />
    <div
      id="switcher"
      class="flex items-center justify-center gap-4 font-medium"
      class:flex-row-reverse={isReferral}>
      <a href="/" class="whitespace-nowrap text-foreground">
        {#if !isReferral && !mobileToggle}
          Graphini
        {/if}
      </a>
    </div>
  </div>
  <div
    id="menu"
    class="flex w-full flex-wrap items-center justify-end gap-3 overflow-hidden md:w-auto md:flex-nowrap md:justify-between">
    <!-- <DropdownNavMenu icon={GithubIcon} links={githubLinks} />
    <Separator orientation="vertical" /> -->
    {@render children()}
  </div>
  {@render mobileToggle?.()}
</nav>
