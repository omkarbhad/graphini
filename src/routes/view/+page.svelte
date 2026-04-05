<script lang="ts">
  import { initHandler } from '$/util/util';
  import { View } from '$lib/components/layout';
  import { onMount } from 'svelte';
  onMount(initHandler);
</script>

<svelte:head>
  <meta name="robots" content="noindex" />
</svelte:head>

<View shouldShowGrid={false} />
