<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';

  // /canvas/* is deprecated — editor lives at /workspace/{id}
  onMount(() => {
    goto(resolve('/dashboard'), { replaceState: true });
  });
</script>

<div class="flex h-screen items-center justify-center bg-background">
  <span class="text-sm text-muted-foreground">Redirecting to dashboard...</span>
</div>
