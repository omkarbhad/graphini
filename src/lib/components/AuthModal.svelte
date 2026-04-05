<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';
  import { X } from 'lucide-svelte';

  interface Props {
    open: boolean;
    onClose: () => void;
    gate?: boolean;
  }

  let { open, onClose, gate = false }: Props = $props();

  function handleSignIn() {
    authStore.login(window.location.pathname);
  }
</script>

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    role="dialog"
    aria-modal="true">
    <!-- Modal -->
    <div
      class="relative mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
      <!-- Close (hidden in gate mode) -->
      {#if !gate}
        <button
          type="button"
          class="absolute top-3 right-3 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          onclick={onClose}>
          <X class="size-4" />
        </button>
      {/if}

      <!-- Header -->
      <div class="mb-6 text-center">
        <img src="/brand/logo.png" alt="Graphini" class="mx-auto mb-3 size-10" />
        <h2 class="text-lg font-semibold text-foreground">Welcome to Graphini</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          {#if gate}
            Sign in to continue
          {:else}
            Sign in to your account
          {/if}
        </p>
      </div>

      <!-- Sign in button -->
      <button
        type="button"
        onclick={handleSignIn}
        class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
        Sign in with Google
      </button>
    </div>
  </div>
{/if}
