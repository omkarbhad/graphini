<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';
  import { X } from 'lucide-svelte';

  interface Props {
    open: boolean;
    onClose: () => void;
    gate?: boolean;
  }

  let { open, onClose, gate = false }: Props = $props();

  let mode = $state<'login' | 'register'>('login');
  let email = $state('');
  let password = $state('');
  let displayName = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit() {
    error = '';
    loading = true;
    try {
      if (mode === 'login') {
        const result = await authStore.login(email, password);
        if (result.success) {
          onClose();
          email = '';
          password = '';
        } else {
          error = result.error || 'Login failed';
        }
      } else {
        const result = await authStore.register(email, password, displayName || undefined);
        if (result.success) {
          onClose();
          email = '';
          password = '';
          displayName = '';
        } else {
          error = result.error || 'Registration failed';
        }
      }
    } catch (e: any) {
      error = e?.message || 'Something went wrong';
    } finally {
      loading = false;
    }
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
        <h2 class="text-lg font-semibold text-foreground">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p class="mt-1 text-sm text-muted-foreground">
          {#if gate}
            {mode === 'login'
              ? 'Sign in to continue'
              : 'Create an account to get started with 100 free gems'}
          {:else}
            {mode === 'login' ? 'Sign in to your account' : 'Get started with 100 free gems'}
          {/if}
        </p>
      </div>

      <!-- Form -->
      <form
        onsubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        class="space-y-4">
        {#if mode === 'register'}
          <div>
            <label for="auth-name" class="mb-1.5 block text-sm font-medium text-foreground"
              >Name</label>
            <input
              id="auth-name"
              type="text"
              bind:value={displayName}
              placeholder="Your name"
              class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
          </div>
        {/if}

        <div>
          <label for="auth-email" class="mb-1.5 block text-sm font-medium text-foreground"
            >Email</label>
          <input
            id="auth-email"
            type="email"
            bind:value={email}
            placeholder="you@example.com"
            required
            class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
        </div>

        <div>
          <label for="auth-password" class="mb-1.5 block text-sm font-medium text-foreground"
            >Password</label>
          <input
            id="auth-password"
            type="password"
            bind:value={password}
            placeholder="Min 6 characters"
            required
            minlength="6"
            class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
        </div>

        {#if error}
          <div class="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</div>
        {/if}

        <button
          type="submit"
          disabled={loading}
          class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
          {#if loading}
            <span class="inline-flex items-center gap-2">
              <span
                class="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
              ></span>
              {mode === 'login' ? 'Signing in...' : 'Creating account...'}
            </span>
          {:else}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          {/if}
        </button>
      </form>

      <!-- Toggle mode -->
      <div class="mt-4 text-center text-sm">
        <span class="text-muted-foreground">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
        </span>
        <button
          type="button"
          class="ml-1 font-medium text-primary hover:text-primary/80"
          onclick={() => {
            mode = mode === 'login' ? 'register' : 'login';
            error = '';
          }}>
          {mode === 'login' ? 'Sign up' : 'Sign in'}
        </button>
      </div>
    </div>
  </div>
{/if}
