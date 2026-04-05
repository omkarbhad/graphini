<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/stores';
  import { workspaceStore } from '$lib/stores/workspace.svelte';
  import { onMount } from 'svelte';
  import { Loader2, AlertCircle, ArrowLeft } from 'lucide-svelte';
  import { fade } from 'svelte/transition';

  let error = $state<string | null>(null);

  onMount(async () => {
    const id = $page.params.id as string;
    const success = await workspaceStore.load(id);
    if (success) {
      goto(resolve('/edit'), { replaceState: true });
    } else {
      error = workspaceStore.state.error || 'Failed to load workspace';
    }
  });
</script>

{#if error}
  <div class="flex h-screen items-center justify-center bg-background" in:fade={{ duration: 200 }}>
    <div class="text-center">
      <div
        class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl"
        style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.15);">
        <AlertCircle class="size-6 text-red-400" />
      </div>
      <h2 class="text-base font-semibold text-foreground">Couldn't load workspace</h2>
      <p class="mt-2 max-w-xs text-[13px] text-muted-foreground/70">{error}</p>
      <button
        class="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-all hover:bg-primary/90"
        onclick={() => goto(resolve('/dashboard'))}>
        <ArrowLeft class="size-3.5" />
        Back to Dashboard
      </button>
    </div>
  </div>
{:else}
  <div class="flex h-screen items-center justify-center bg-background">
    <div class="flex flex-col items-center gap-3 text-muted-foreground">
      <Loader2 class="size-6 animate-spin text-primary" />
      <span class="text-[13px]">Loading workspace...</span>
    </div>
  </div>
{/if}
