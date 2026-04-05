<script lang="ts">
  import { env } from '$/util/env';
  import { urlsStore } from '$/util/state/url';
  import { buttonVariants } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Separator } from '$lib/components/ui/separator';
  import ShareIcon from '~icons/material-symbols/share';
  import CopyInput from '$lib/components/common/CopyInput.svelte';
  import MermaidChartIcon from '$lib/components/common/MermaidChartIcon.svelte';

  interface Props {
    class?: string;
  }

  let { class: className }: Props = $props();
</script>

<Dialog.Root>
  <Dialog.Trigger
    class={[buttonVariants({ size: 'icon', variant: 'ghost' }), className]}
    title="Share"
    aria-label="Share diagram">
    <ShareIcon class="size-4" />
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title class="text-xl">Shareable links</Dialog.Title>
      <Dialog.Description>Share your diagrams with others.</Dialog.Description>
    </Dialog.Header>

    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <h2 class="flex items-center gap-2">
          <img class="size-5" src="/favicons/favicon.png" alt="Mermaid Live Editor" />
          Mermaid Live Editor
        </h2>
        <CopyInput value={window.location.href} />
        <Dialog.Description>
          The content of the diagrams you create never leaves your browser.
        </Dialog.Description>
      </div>
      {#if env.isEnabledMermaidChartLinks}
        <Separator />
        <div class="flex flex-col gap-2">
          <h2 class="flex items-center gap-2">
            <MermaidChartIcon class="size-5" />
            Mermaid Chart Playground
          </h2>
          <CopyInput value={$urlsStore.mermaidChart({ medium: 'share' }).playground} />
          <Dialog.Description>
            Opens the Mermaid Chart Playground with Mermaid AI, Visual Editor, and more.
          </Dialog.Description>
        </div>
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>
