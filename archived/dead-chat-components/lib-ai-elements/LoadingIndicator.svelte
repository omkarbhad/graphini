<script lang="ts">
  import { Loader2 } from 'lucide-svelte';

  interface Props {
    message: string;
    status?: 'loading' | 'complete' | 'error';
  }

  let { message, status = 'loading' }: Props = $props();
</script>

<div class="mb-4">
  <div
    class="flex items-center gap-3 rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-4 backdrop-blur-sm">
    <div class="relative">
      {#if status === 'loading'}
        <Loader2 class="size-5 animate-spin text-primary" />
        <div class="absolute -inset-1 animate-ping rounded-full bg-primary/20"></div>
      {:else if status === 'complete'}
        <div class="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
          <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7" />
          </svg>
        </div>
      {:else}
        <div class="flex size-5 items-center justify-center rounded-full bg-red-500 text-white">
          <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      {/if}
    </div>
    <div class="flex-1">
      <p class="text-sm font-medium text-foreground">{message}</p>
      {#if status === 'loading'}
        <p class="text-xs text-muted-foreground">Please wait...</p>
      {/if}
    </div>
  </div>
</div>
