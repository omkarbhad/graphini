<script lang="ts">
  import { loadingStateStore } from '$/util/loading';
  import { getLastProgrammaticHash, toggleDarkTheme } from '$/util/state';
  import { initHandler } from '$/util/util';
  import { Toaster } from '$lib/components/ui/sonner/index.js';
  import { authStore } from '$lib/stores/auth.svelte.js';
  import * as kvModule from '$lib/stores/kvStore';
  import { mode, ModeWatcher } from 'mode-watcher';
  import { onMount, type Snippet } from 'svelte';
  import '../app.css';

  let { children }: { children: Snippet } = $props();

  // Register KV store module globally for synchronous access from .svelte.ts files
  (globalThis as any).__kvStoreModule = kvModule;
  // Initialize KV store (loads all user settings from Supabase)
  kvModule.kvInit();

  // This can be removed once https://github.com/sveltejs/kit/issues/1612 is fixed.
  onMount(() => {
    // Initialize auth store to check for existing session
    authStore.init();

    window.addEventListener('hashchange', () => {
      // Skip re-init if the hash was set programmatically by our own URL subscription
      const currentHash = window.location.hash.slice(1);
      if (currentHash && currentHash === getLastProgrammaticHash()) {
        return;
      }
      void initHandler();
    });

    // Apply initial theme class
    const currentMode = $mode;
    if (currentMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Service worker disabled — no service-worker.js exists
    // Unregister any stale service workers from previous deployments
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
  });

  $effect(() => {
    toggleDarkTheme($mode === 'dark');
    // Apply dark class to HTML element for CSS styling
    if ($mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  });
</script>

<ModeWatcher />
<Toaster />

<main class="h-[100dvh]">
  {@render children()}
</main>

{#if $loadingStateStore.loading}
  <div
    class="absolute top-0 left-0 z-50 flex h-screen w-screen justify-center bg-background/60 align-middle backdrop-blur-sm">
    <div class="my-auto text-2xl font-semibold text-foreground">
      <div class="loader mx-auto"></div>
      <div>{$loadingStateStore.message}</div>
    </div>
  </div>
{/if}

<style>
  .loader {
    border: 0.45em solid color-mix(in oklch, var(--color-border), transparent 30%);
    border-radius: 50%;
    border-top: 0.45em solid var(--color-primary);
    width: 3em;
    height: 3em;
    -webkit-animation: spin 2s linear infinite; /* Safari */
    animation: spin 2s linear infinite;
  }

  /* Safari */
  @-webkit-keyframes spin {
    0% {
      -webkit-transform: rotate(0deg);
    }
    100% {
      -webkit-transform: rotate(360deg);
    }
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
