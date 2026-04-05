<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';

  onMount(async () => {
    // Redirect to /canvas (the main editor page)
    await goto(`${base}/canvas`, {
      replaceState: true
    });
  });
</script>
