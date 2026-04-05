<script lang="ts">
  import SyncRoughToolbar from '$lib/components/SyncRoughToolbar.svelte';
  import VersionSecurityToolbar from '$lib/components/VersionSecurityToolbar.svelte';
</script>

<div class="flex w-full flex-wrap items-center justify-between gap-4 md:flex-nowrap md:gap-6">
  <div
    class="flex min-w-[10rem] justify-start transition-transform duration-200 hover:scale-[1.02] md:flex-1">
    <SyncRoughToolbar />
  </div>
  <div
    class="flex min-w-[12rem] justify-end transition-transform duration-200 hover:scale-[1.02] md:flex-1">
    <VersionSecurityToolbar />
  </div>
</div>
